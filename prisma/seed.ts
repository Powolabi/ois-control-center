import { PrismaClient, LocationType, SystemType, SystemStatus, Criticality, Environment } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  const locations = [
    {
      name: 'Home Lab',
      type: LocationType.HOME_LAB,
      description: 'Primary home infrastructure and development lab',
    },
    {
      name: 'DigitalOcean',
      type: LocationType.CLOUD,
      description: 'Cloud infrastructure provider',
      provider: 'DigitalOcean',
    },
  ]

  console.log('Creating locations...')
  for (const location of locations) {
    const existing = await prisma.location.findFirst({
      where: { name: location.name },
    })
    if (!existing) {
      await prisma.location.create({
        data: location,
      })
    }
  }

  const homeLab = await prisma.location.findFirst({
    where: { name: 'Home Lab' },
  })

  const digitalOcean = await prisma.location.findFirst({
    where: { name: 'DigitalOcean' },
  })

  if (!homeLab || !digitalOcean) {
    throw new Error('Locations not found')
  }

  const systems = [
    {
      name: 'Proxmox ois4',
      slug: 'proxmox-ois4',
      type: SystemType.PROXMOX_HOST,
      status: SystemStatus.ONLINE,
      criticality: Criticality.CRITICAL,
      environment: Environment.PRODUCTION,
      description: 'Primary Proxmox hypervisor node',
      locationId: homeLab.id,
    },
    {
      name: 'DigitalOcean Gateway',
      slug: 'digitalocean-gateway',
      type: SystemType.VPS,
      status: SystemStatus.ONLINE,
      criticality: Criticality.CRITICAL,
      environment: Environment.PRODUCTION,
      description: 'Public cloud gateway and reverse proxy',
      locationId: digitalOcean.id,
    },
    {
      name: 'Bare-metal Nginx Proxy',
      slug: 'nginx-proxy',
      type: SystemType.NETWORK_DEVICE,
      status: SystemStatus.ONLINE,
      criticality: Criticality.HIGH,
      environment: Environment.PRODUCTION,
      description: 'Primary reverse proxy for web services',
      locationId: homeLab.id,
    },
    {
      name: 'Synology DS212',
      slug: 'synology-ds212',
      type: SystemType.NAS,
      status: SystemStatus.ONLINE,
      criticality: Criticality.HIGH,
      environment: Environment.PRODUCTION,
      description: 'Network attached storage',
      locationId: homeLab.id,
    },
    {
      name: 'WireGuard Tunnel',
      slug: 'wireguard-tunnel',
      type: SystemType.NETWORK_CONNECTION,
      status: SystemStatus.ONLINE,
      criticality: Criticality.CRITICAL,
      environment: Environment.PRODUCTION,
      description: 'Secure tunnel between cloud gateway and home lab',
      locationId: digitalOcean.id,
    },
  ]

  console.log('Creating systems...')
  const createdSystems: Record<string, any> = {}
  for (const system of systems) {
    const existing = await prisma.system.findUnique({
      where: { slug: system.slug },
    })
    if (!existing) {
      const created = await prisma.system.create({
        data: system,
      })
      createdSystems[system.slug] = created
    } else {
      createdSystems[system.slug] = existing
    }
  }

  console.log('Creating dependencies...')
  
  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
