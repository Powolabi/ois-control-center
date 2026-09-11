import { describe, it, expect } from 'vitest'
import { slugify, isValidIpAddress } from '@/lib/utils'

describe('slugify', () => {
  it('converts text to slug format', () => {
    expect(slugify('Hello World')).toBe('hello-world')
    expect(slugify('Proxmox Host 1')).toBe('proxmox-host-1')
  })

  it('handles special characters', () => {
    expect(slugify('Test@#$%System')).toBe('testsystem')
  })

  it('handles multiple spaces', () => {
    expect(slugify('Multiple   Spaces')).toBe('multiple-spaces')
  })
})

describe('isValidIpAddress', () => {
  it('validates IPv4 addresses', () => {
    expect(isValidIpAddress('192.168.1.1')).toBe(true)
    expect(isValidIpAddress('10.0.0.1')).toBe(true)
    expect(isValidIpAddress('255.255.255.255')).toBe(true)
  })

  it('rejects invalid IPv4 addresses', () => {
    expect(isValidIpAddress('256.1.1.1')).toBe(false)
    expect(isValidIpAddress('192.168.1')).toBe(false)
    expect(isValidIpAddress('not-an-ip')).toBe(false)
  })

  it('validates IPv6 addresses', () => {
    expect(isValidIpAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true)
  })
})
