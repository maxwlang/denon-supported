import { LoggerOptions } from 'pino'

export interface DenonConfig {
    name?: string
    sonosInterfaceSource: string
    ip?: string
    searchTimeout: number
}

export interface SonosConfig {
    name?: string
    ip?: string
    searchTimeout?: number
}

export interface Config {
    volumeMultiplier: number
    sonos: SonosConfig
    denon: DenonConfig
    logger: LoggerOptions
}
