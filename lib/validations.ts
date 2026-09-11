import { z } from "zod"
import { 
  LocationType, 
  SystemType, 
  SystemStatus, 
  Criticality, 
  Environment,
  DependencyType,
  EndpointType
} from "@prisma/client"

const ipAddressRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/

export const locationSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  type: z.nativeEnum(LocationType),
  description: z.string().optional(),
  city: z.string().optional(),
  provider: z.string().optional(),
})

export const systemSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  type: z.nativeEnum(SystemType),
  status: z.nativeEnum(SystemStatus),
  criticality: z.nativeEnum(Criticality),
  environment: z.nativeEnum(Environment),
  description: z.string().optional(),
  hostname: z.string().optional(),
  privateIp: z.string().optional().refine(
    (val) => !val || ipAddressRegex.test(val),
    "Invalid IP address format"
  ),
  publicIp: z.string().optional().refine(
    (val) => !val || ipAddressRegex.test(val),
    "Invalid IP address format"
  ),
  operatingSystem: z.string().optional(),
  platformVersion: z.string().optional(),
  vmContainerId: z.string().optional(),
  cpuAllocation: z.number().int().positive().optional().nullable(),
  memoryAllocation: z.number().int().positive().optional().nullable(),
  storageAllocation: z.number().int().positive().optional().nullable(),
  accessMethod: z.string().optional(),
  credentialReference: z.string().optional(),
  owner: z.string().optional(),
  locationId: z.string().min(1, "Location is required"),
  parentSystemId: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  lastVerifiedAt: z.date().optional().nullable(),
})

export const dependencySchema = z.object({
  sourceSystemId: z.string().min(1, "Source system is required"),
  targetSystemId: z.string().min(1, "Target system is required"),
  type: z.nativeEnum(DependencyType),
  description: z.string().optional(),
}).refine(
  (data) => data.sourceSystemId !== data.targetSystemId,
  {
    message: "A system cannot depend on itself",
    path: ["targetSystemId"],
  }
)

export const endpointSchema = z.object({
  systemId: z.string().min(1, "System is required"),
  name: z.string().min(1, "Name is required").max(255),
  type: z.nativeEnum(EndpointType),
  address: z.string().min(1, "Address is required"),
  port: z.number().int().min(1).max(65535).optional().nullable(),
  protocol: z.string().optional(),
  isPublic: z.boolean().default(false),
  notes: z.string().optional(),
})

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export type LocationInput = z.infer<typeof locationSchema>
export type SystemInput = z.infer<typeof systemSchema>
export type DependencyInput = z.infer<typeof dependencySchema>
export type EndpointInput = z.infer<typeof endpointSchema>
export type LoginInput = z.infer<typeof loginSchema>
