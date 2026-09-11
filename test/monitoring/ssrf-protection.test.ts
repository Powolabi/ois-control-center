import { describe, it, expect, beforeEach } from 'vitest'
import {
  validateIPAddress,
  validateURL,
  validateTCPTarget,
} from '@/lib/monitoring/ssrf-protection'

describe('SSRF Protection', () => {
  describe('validateIPAddress', () => {
    it('allows public IPv4 addresses when allowed', () => {
      const result = validateIPAddress('8.8.8.8', { allowPublic: true })
      expect(result.allowed).toBe(true)
    })

    it('blocks public IPv4 addresses when not allowed', () => {
      const result = validateIPAddress('8.8.8.8', { allowPublic: false })
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Public targets not allowed')
    })

    it('blocks loopback addresses', () => {
      const result = validateIPAddress('127.0.0.1')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Private')
    })

    it('blocks link-local addresses', () => {
      const result = validateIPAddress('169.254.1.1')
      expect(result.allowed).toBe(false)
    })

    it('blocks private network 10.0.0.0/8', () => {
      const result = validateIPAddress('10.0.0.1')
      expect(result.allowed).toBe(false)
    })

    it('blocks private network 172.16.0.0/12', () => {
      const result = validateIPAddress('172.16.0.1')
      expect(result.allowed).toBe(false)
    })

    it('blocks private network 192.168.0.0/16', () => {
      const result = validateIPAddress('192.168.1.1')
      expect(result.allowed).toBe(false)
    })

    it('blocks carrier-grade NAT 100.64.0.0/10', () => {
      const result = validateIPAddress('100.64.0.1')
      expect(result.allowed).toBe(false)
    })

    it('blocks multicast addresses', () => {
      const result = validateIPAddress('224.0.0.1')
      expect(result.allowed).toBe(false)
    })

    it('blocks AWS metadata endpoint', () => {
      const result = validateIPAddress('169.254.169.254')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('metadata')
    })

    it('blocks Alibaba Cloud metadata endpoint', () => {
      const result = validateIPAddress('100.100.100.200')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('metadata')
    })

    it('allows private IPs in allowlist', () => {
      const result = validateIPAddress('192.168.1.100', {
        allowedPrivateCIDRs: ['192.168.1.0/24'],
      })
      expect(result.allowed).toBe(true)
    })

    it('blocks private IPs not in allowlist', () => {
      const result = validateIPAddress('192.168.2.100', {
        allowedPrivateCIDRs: ['192.168.1.0/24'],
      })
      expect(result.allowed).toBe(false)
    })

    it('blocks IPv6 loopback', () => {
      const result = validateIPAddress('::1')
      expect(result.allowed).toBe(false)
    })

    it('blocks IPv6 link-local', () => {
      const result = validateIPAddress('fe80::1')
      expect(result.allowed).toBe(false)
    })

    it('blocks IPv6 unique local', () => {
      const result = validateIPAddress('fc00::1')
      expect(result.allowed).toBe(false)
    })

    it('blocks IPv6 AWS metadata', () => {
      const result = validateIPAddress('fd00:ec2::254')
      expect(result.allowed).toBe(false)
    })
  })

  describe('validateURL', () => {
    it('rejects invalid URLs', async () => {
      const result = await validateURL('not a url')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Invalid URL')
    })

    it('rejects non-HTTP protocols', async () => {
      const result = await validateURL('ftp://example.com')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('HTTP')
    })

    it('rejects file:// URLs', async () => {
      const result = await validateURL('file:///etc/passwd')
      expect(result.allowed).toBe(false)
    })

    it('rejects URLs with embedded credentials', async () => {
      const result = await validateURL('http://user:pass@example.com')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('credentials')
    })

    it('rejects disallowed ports', async () => {
      const result = await validateURL('http://example.com:9999', {
        allowedPorts: [80, 443],
      })
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Port')
    })

    it('allows allowed ports', async () => {
      // Using IP to avoid DNS
      const result = await validateURL('http://8.8.8.8:8080', {
        allowPublic: true,
        allowedPorts: [80, 443, 8080],
      })
      expect(result.allowed).toBe(true)
    })

    it('rejects URLs pointing to private IPs', async () => {
      const result = await validateURL('http://192.168.1.1')
      expect(result.allowed).toBe(false)
    })

    it('rejects URLs pointing to loopback', async () => {
      const result = await validateURL('http://127.0.0.1')
      expect(result.allowed).toBe(false)
    })

    it('rejects URLs pointing to metadata endpoints', async () => {
      const result = await validateURL('http://169.254.169.254')
      expect(result.allowed).toBe(false)
    })

    it('allows public IPs when enabled', async () => {
      const result = await validateURL('http://8.8.8.8', {
        allowPublic: true,
      })
      expect(result.allowed).toBe(true)
    })
  })

  describe('validateTCPTarget', () => {
    it('rejects disallowed ports', async () => {
      const result = await validateTCPTarget('example.com', 9999, {
        allowedPorts: [22, 80, 443],
      })
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Port')
    })

    it('rejects private IPs', async () => {
      const result = await validateTCPTarget('192.168.1.1', 22)
      expect(result.allowed).toBe(false)
    })

    it('rejects loopback addresses', async () => {
      const result = await validateTCPTarget('127.0.0.1', 22)
      expect(result.allowed).toBe(false)
    })

    it('allows public IPs with allowed ports', async () => {
      const result = await validateTCPTarget('8.8.8.8', 443, {
        allowPublic: true,
        allowedPorts: [22, 80, 443],
      })
      expect(result.allowed).toBe(true)
    })

    it('allows private IPs in allowlist', async () => {
      const result = await validateTCPTarget('192.168.1.100', 22, {
        allowedPrivateCIDRs: ['192.168.1.0/24'],
        allowedPorts: [22, 80, 443],
      })
      expect(result.allowed).toBe(true)
    })
  })
})
