import { LoggerOptions } from 'pino'

export interface DenonConfig {
    name?: string
    sonosInterfaceSource: string
    ip?: string
    searchTimeout: number
    volumeMultiplier: number
}

export interface SonosConfig {
    name?: string
    ip?: string
    searchTimeout?: number
    volumeMultiplier: number
}

export interface Config {
    sonos: SonosConfig
    denon: DenonConfig
    logger: LoggerOptions
}
