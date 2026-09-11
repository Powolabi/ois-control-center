import { promises as dns } from 'dns'
import { URL } from 'url'

// Cloud metadata endpoints that must always be blocked
const BLOCKED_METADATA_HOSTS = [
  '169.254.169.254', // AWS, Azure, GCP, DigitalOcean, Oracle Cloud
  'fd00:ec2::254', // AWS IMDSv2 IPv6
  '100.100.100.200', // Alibaba Cloud
  'metadata.google.internal', // GCP
  'metadata', // GCP short form
]

interface SSRFValidationOptions {
  allowPublic?: boolean
  allowedPrivateCIDRs?: string[]
  allowedPorts?: number[]
}

interface ValidationResult {
  allowed: boolean
  reason?: string
  resolvedIp?: string
}

/**
 * Check if an IP address is in a CIDR range
 */
function ipInCIDR(ip: string, cidr: string): boolean {
  const [range, bits = '32'] = cidr.split('/')
  const mask = ~(2 ** (32 - parseInt(bits)) - 1)
  
  const ipNum = ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0
  const rangeNum = range.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0
  
  return (ipNum & mask) === (rangeNum & mask)
}

/**
 * Check if an IPv4 address is private/reserved
 */
function isPrivateIPv4(ip: string): boolean {
  const privateRanges = [
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16',
    '127.0.0.0/8', // loopback
    '169.254.0.0/16', // link-local
    '224.0.0.0/4', // multicast
    '240.0.0.0/4', // reserved
    '0.0.0.0/8', // unspecified
    '100.64.0.0/10', // carrier-grade NAT
  ]
  
  return privateRanges.some(range => ipInCIDR(ip, range))
}

/**
 * Check if an IPv6 address is private/reserved
 */
function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  
  // loopback
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true
  
  // link-local
  if (lower.startsWith('fe80:')) return true
  if (lower.startsWith('fe80::')) return true
  
  // unique local
  if (lower.startsWith('fc00:') || lower.startsWith('fd00:')) return true
  
  // multicast
  if (lower.startsWith('ff00:')) return true
  
  // unspecified
  if (lower === '::' || lower === '0:0:0:0:0:0:0:0') return true
  
  return false
}

/**
 * Validate an IP address against SSRF rules
 */
export function validateIPAddress(
  ip: string,
  options: SSRFValidationOptions = {}
): ValidationResult {
  const {
    allowPublic = true,
    allowedPrivateCIDRs = [],
    allowedPorts = [22, 80, 443, 5432, 6379, 8000, 8080],
  } = options
  
  // Check for metadata endpoints
  if (BLOCKED_METADATA_HOSTS.includes(ip.toLowerCase())) {
    return {
      allowed: false,
      reason: 'Blocked cloud metadata endpoint',
      resolvedIp: ip,
    }
  }
  
  // Determine if IPv4 or IPv6
  const isIPv6 = ip.includes(':')
  const isPrivate = isIPv6 ? isPrivateIPv6(ip) : isPrivateIPv4(ip)
  
  if (!isPrivate) {
    // Public IP - allow if public targets are allowed
    if (!allowPublic) {
      return {
        allowed: false,
        reason: 'Public targets not allowed',
        resolvedIp: ip,
      }
    }
    return { allowed: true, resolvedIp: ip }
  }
  
  // Private IP - check allowlist
  if (allowedPrivateCIDRs.length === 0) {
    return {
      allowed: false,
      reason: 'Private networks blocked by default',
      resolvedIp: ip,
    }
  }
  
  // Check if IP is in allowed private ranges (IPv4 only for now)
  if (!isIPv6) {
    for (const cidr of allowedPrivateCIDRs) {
      if (ipInCIDR(ip, cidr)) {
        return { allowed: true, resolvedIp: ip }
      }
    }
  }
  
  return {
    allowed: false,
    reason: 'Private IP not in allowlist',
    resolvedIp: ip,
  }
}

/**
 * Validate a URL for SSRF protection
 */
export async function validateURL(
  urlString: string,
  options: SSRFValidationOptions = {}
): Promise<ValidationResult> {
  let url: URL
  
  try {
    url = new URL(urlString)
  } catch (error) {
    return { allowed: false, reason: 'Invalid URL format' }
  }
  
  // Only allow HTTP and HTTPS
  if (!['http:', 'https:'].includes(url.protocol)) {
    return { allowed: false, reason: 'Only HTTP(S) protocols allowed' }
  }
  
  // Reject URLs with embedded credentials
  if (url.username || url.password) {
    return { allowed: false, reason: 'URLs with embedded credentials not allowed' }
  }
  
  // Reject URLs with non-standard ports for now (can be made configurable)
  const { allowedPorts = [22, 80, 443, 5432, 6379, 8000, 8080] } = options
  const port = parseInt(url.port || (url.protocol === 'https:' ? '443' : '80'))
  
  if (!allowedPorts.includes(port)) {
    return { allowed: false, reason: 'Port not in allowlist' }
  }
  
  // Check hostname directly if it's an IP
  const hostname = url.hostname
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6Regex = /^\[?[0-9a-fA-F:]+\]?$/
  
  if (ipRegex.test(hostname)) {
    return validateIPAddress(hostname, options)
  }
  
  if (ipv6Regex.test(hostname.replace(/\[|\]/g, ''))) {
    const cleanHostname = hostname.replace(/\[|\]/g, '')
    return validateIPAddress(cleanHostname, options)
  }
  
  // Resolve DNS and validate all returned IPs
  try {
    const addresses = await dns.resolve4(hostname).catch(() => [] as string[])
    const addresses6 = await dns.resolve6(hostname).catch(() => [] as string[])
    
    const allAddresses = [...addresses, ...addresses6]
    
    if (allAddresses.length === 0) {
      return { allowed: false, reason: 'DNS resolution failed' }
    }
    
    // All resolved IPs must pass validation
    for (const ip of allAddresses) {
      const result = validateIPAddress(ip, options)
      if (!result.allowed) {
        return {
          allowed: false,
          reason: `Resolved IP ${ip} blocked: ${result.reason}`,
          resolvedIp: ip,
        }
      }
    }
    
    return { allowed: true, resolvedIp: allAddresses[0] }
  } catch (error) {
    return { allowed: false, reason: 'DNS resolution error' }
  }
}

/**
 * Validate a hostname and port for TCP connections
 */
export async function validateTCPTarget(
  host: string,
  port: number,
  options: SSRFValidationOptions = {}
): Promise<ValidationResult> {
  const { allowedPorts = [22, 80, 443, 5432, 6379, 8000, 8080] } = options
  
  if (!allowedPorts.includes(port)) {
    return { allowed: false, reason: 'Port not in allowlist' }
  }
  
  // If host is an IP address, validate directly
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6Regex = /^[0-9a-fA-F:]+$/
  
  if (ipRegex.test(host)) {
    return validateIPAddress(host, options)
  }
  
  if (ipv6Regex.test(host)) {
    return validateIPAddress(host, options)
  }
  
  // Resolve DNS and validate
  try {
    const addresses = await dns.resolve4(host).catch(() => [] as string[])
    const addresses6 = await dns.resolve6(host).catch(() => [] as string[])
    
    const allAddresses = [...addresses, ...addresses6]
    
    if (allAddresses.length === 0) {
      return { allowed: false, reason: 'DNS resolution failed' }
    }
    
    for (const ip of allAddresses) {
      const result = validateIPAddress(ip, options)
      if (!result.allowed) {
        return {
          allowed: false,
          reason: `Resolved IP ${ip} blocked: ${result.reason}`,
          resolvedIp: ip,
        }
      }
    }
    
    return { allowed: true, resolvedIp: allAddresses[0] }
  } catch (error) {
    return { allowed: false, reason: 'DNS resolution error' }
  }
}

/**
 * Get SSRF protection options from environment
 */
export function getSSRFOptionsFromEnv(): SSRFValidationOptions {
  const allowPublic = process.env.MONITOR_ALLOW_PUBLIC_TARGETS !== 'false'
  
  const allowedPrivateCIDRs = process.env.MONITOR_ALLOWED_PRIVATE_CIDRS
    ? process.env.MONITOR_ALLOWED_PRIVATE_CIDRS.split(',').map(s => s.trim()).filter(Boolean)
    : []
  
  const allowedPorts = process.env.MONITOR_ALLOWED_TCP_PORTS
    ? process.env.MONITOR_ALLOWED_TCP_PORTS.split(',').map(s => parseInt(s.trim())).filter(p => !isNaN(p))
    : [22, 80, 443, 5432, 6379, 8000, 8080]
  
  return {
    allowPublic,
    allowedPrivateCIDRs,
    allowedPorts,
  }
}
