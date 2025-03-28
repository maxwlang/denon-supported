import { EventEmitter } from 'events'

declare module 'denon-heos' {
    export interface DenonHeosEvent {
        event: string
        message: Record<string, string | number | boolean>
    }

    export interface DenonDevice {
        udn: string
        friendlyName: string
        modelName: string
        modelNumber: string
        deviceId: string
        wlanMac: string
        address: string
        instance: DenonHeos
    }

    export interface DenonPlayer {
        name: string
        pid: number
        model: string
        version: string
        ip: string
        network: string
        lineout: number
        serial: string
    }
    export class Discover extends EventEmitter {
        constructor()
        start(): void
        stop(): void
        on(event: 'device', listener: (device: DenonDevice) => void): this
    }

    export class DenonHeos extends EventEmitter {
        constructor({ address }: { address: string })
        debug(...args: unknown[]): void
        setAddress(address: string): void
        on(event, listener: (event: DenonHeosEvent) => void): this
        async connect(): Promise<void>
        async disconnect(): Promise<void>
        async reconnect(): Promise<void>
        async send(command: string, params: unknown): Promise<unknown>
        async systemRegisterForChangeEvents(): Promise<unknown>
        async systemSignIn({
            username,
            password
        }: {
            username: string
            password: string
        }): Promise<unknown>
        async playerGetPlayers(): Promise<DenonPlayer[]>
        async playerGetPlayerInfo({ pid }: { pid: number }): Promise<unknown>
        async playerGetPlayState({ pid }: { pid: number }): Promise<unknown>
        async playerSetPlayState({ pid }: { pid: number }): Promise<unknown>
        async playerGetNowPlayingMedia({
            pid
        }: {
            pid: number
        }): Promise<unknown>
        async playerGetVolume({ pid }: { pid: number }): Promise<unknown>
        async playerSetVolume({
            pid,
            level
        }: {
            pid: number
            level: number
        }): Promise<unknown>
        async playerGetMute({ pid }: { pid: number }): Promise<unknown>
        async playerSetMute({
            pid,
            mute
        }: {
            pid: number
            mute: boolean
        }): Promise<unknown>
        async playerPlayNext({ pid }: { pid: number }): Promise<unknown>
        async playerPlayPrevious({ pid }: { pid: number }): Promise<unknown>
        async playerPlayPreset({
            pid,
            preset
        }: {
            pid: number
            preset: string
        }): Promise<unknown>
        async playerGetPlayMode({ pid }: { pid: number }): Promise<unknown>
        async playerSetPlayMode({
            pid,
            shuffle,
            repeat
        }: {
            pid: number
            shuffle: boolean
            repeat: 'on_all' | 'on_one' | 'off'
        }): Promise<unknown>
        async browseGetMusicSources(): Promise<unknown>
        async browsePlayStream({
            pid,
            sid,
            mid,
            spid,
            input
        }: {
            pid: number
            sid: string
            mid: string
            spid: number
            input: string
        }): Promise<unknown>
        async browsePlayInput({
            pid,
            input
        }: {
            pid: number
            input: string
        }): Promise<unknown>
        async browsePlayAuxIn1({ pid }: { pid: number }): Promise<unknown>
    }
}
