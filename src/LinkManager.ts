import { DenonDevice, DenonHeosEvent } from 'denon-heos'
import { Logger } from 'pino'
import { Sonos } from 'sonos'
import {
    getDenonPid,
    writeDenonMute,
    writeDenonPower,
    writeDenonSource,
    writeDenonVolume
} from './denon'
import { debounce } from './util'
import { Config } from './types'

interface SonosWatcher {
    interval: NodeJS.Timeout | null
    lastValue: string | number | boolean | null
}

/**
 * LinkManager class to manage linking of a Denon AVR and a Sonos Device together.
 * Regarding device communication, it should:
 * - Hold the denon and sonos device references
 * - Watch for volume changes on the denon device and update the sonos device volume
 * - Watch for volume changes on the sonos device and update the denon device volume
 * - Watch for a play state on the sonos device and turn on the denon device if it is off
 * - Watch for a play state on the sonos device and turn the denon input to "sonos" if it is not already
 *
 * Regarding the device itself it should:
 * - Reconnect the devices if they are disconnected
 *
 * Please note:
 * - The denon device reference contains an "instance" property that is the actual device instance. This instance must be connected to. It is an event emitter that has 'disconnected' and 'connected' events. It also has a reconnect method.
 * - The sonos device does not have an instance property. It is not an event emitter, so you will need to manually watch for changes. It has the following async methods that will assist with that task: `getVolume(): Promise<number>`, `setVolume(volume: number,channel?: string): Promise<Record<string, never>>`, `getMuted(): Promise<boolean>`, getCurrentState(): Promise<'playing' | 'paused' | 'stopped'>
 */
export default class LinkManager {
    sonosWatchers: Record<string, SonosWatcher> = {}
    sonosDevice: Sonos
    denonPid: number | null = null
    denonDevice: DenonDevice
    config: Config
    logger: Logger

    private debouncedSetSonosVolume: (level: number) => void
    private debouncedSetDenonVolume: (ipAddress: string, level: number) => void
    private debouncedSetSonosMute: (mute: boolean) => void
    private debouncedSetDenonMute: (ipAddress: string, mute: boolean) => void

    constructor(
        denonDevice: DenonDevice,
        sonosDevice: Sonos,
        config: Config,
        logger: Logger
    ) {
        this.denonDevice = denonDevice
        this.sonosDevice = sonosDevice
        this.config = config
        this.logger = logger

        this.debouncedSetSonosVolume = debounce(async level => {
            this.logger.info(`Setting Sonos volume to ${level}`)
            await this.sonosDevice.setVolume(level)
        }, 100)

        this.debouncedSetDenonVolume = debounce(async (ipAddress, level) => {
            this.logger.info(`Setting Denon volume to ${level}`)
            await writeDenonVolume(ipAddress, level)
        }, 100)

        this.debouncedSetSonosMute = debounce(async mute => {
            this.logger.info(`Setting Sonos mute to ${mute}`)
            await this.sonosDevice.setMuted(mute)
        }, 300)

        this.debouncedSetDenonMute = debounce(async (ipAddress, mute) => {
            this.logger.info(`Setting Denon mute to ${mute}`)
            await writeDenonMute(ipAddress, mute)
        }, 300)
    }

    private registerDenonEvents(): void {
        this.logger.info('Registering Denon events')

        // Lifecycle
        this.denonDevice.instance.on('disconnected', () => {
            this.logger.error('Denon device disconnected')
        })
        this.denonDevice.instance.on('connected', async () => {
            this.logger.info('Denon device connected')
            this.denonPid = await getDenonPid(this.denonDevice)
        })
        this.denonDevice.instance.on('connecting', () => {
            this.logger.info('Denon device connecting')
        })

        // Control
        this.denonDevice.instance.on('event', this.handleDenonEvent.bind(this))
    }

    private async handleDenonEvent(event: DenonHeosEvent): Promise<void> {
        this.logger.debug(`Denon event: ${event.event}`)
        this.logger.trace(
            `Denon event message: ${JSON.stringify(event.message, null, 2)}`
        )
        const pid = this.denonPid
        if (event.event !== 'player_volume_changed' || !pid) return

        const { mute, level } = event.message

        this.logger.debug(
            `Denon volume or mute changed. [Volume: ${level}; Mute: ${mute}]`
        )

        if (level) {
            this.logger.debug('Syncing Sonos volume to Denon')
            this.debouncedSetSonosVolume(
                +level //* this.config.volumeMultiplier
            )
        }

        if (mute) {
            this.logger.info('Syncing Denon mute to Sonos')
            this.debouncedSetSonosMute(mute === 'on')
        }
    }

    private registerSonosWatchers(): void {
        this.logger.info('Registering Sonos watchers')

        // Sonos Volume Event
        this.sonosWatchers['level'] = { interval: null, lastValue: null }
        this.sonosWatchers['level'].interval = setInterval(async () => {
            const level = await this.sonosDevice.getVolume()
            this.logger.trace(`Sonos volume: ${level}`)
            if (this.sonosWatchers['level'].lastValue === level) return
            this.logger.debug(`Sonos volume changed to ${level}`)

            const pid = this.denonPid
            if (!pid) return

            this.logger.debug('Syncing Denon volume to Sonos')
            this.debouncedSetDenonVolume(
                this.denonDevice.address,
                level // * this.config.volumeMultiplier
            )
            this.sonosWatchers['level'].lastValue = level
        }, 250)

        // Sonos Play State Event
        this.sonosWatchers['playState'] = { interval: null, lastValue: null }
        this.sonosWatchers['playState'].interval = setInterval(async () => {
            const state = await this.sonosDevice.getCurrentState()
            this.logger.trace(`Sonos play state: ${state}`)
            if (this.sonosWatchers['playState'].lastValue === state) return
            this.logger.debug(`Sonos play state changed to ${state}`)

            if (state === 'playing' && this.denonPid) {
                // When the Sonos Port is applied and playing in the Sonos app, turn the Denon on and switch to the Sonos input
                this.logger.debug('Switching Denon to Sonos input')
                await writeDenonPower(this.denonDevice.address, true)
                await writeDenonSource(
                    this.denonDevice.address,
                    this.config.denon.sonosInterfaceSource
                )
            }
            this.sonosWatchers['playState'].lastValue = state
        }, 250)

        // Sonos Mute Event
        this.sonosWatchers['mute'] = { interval: null, lastValue: null }
        this.sonosWatchers['mute'].interval = setInterval(async () => {
            const mute = await this.sonosDevice.getMuted()
            this.logger.trace(`Sonos mute: ${mute}`)
            if (this.sonosWatchers['mute'].lastValue === mute) return
            this.logger.debug(`Sonos mute changed to ${mute}`)

            const pid = this.denonPid
            if (!pid) return

            this.logger.debug('Syncing Denon mute to Sonos')
            this.debouncedSetDenonMute(this.denonDevice.address, mute)
            this.sonosWatchers['mute'].lastValue = mute
        }, 200)
    }

    private unregisterSonosWatchers(): void {
        this.logger.info('Unregistering Sonos watchers')
        for (const watcher in this.sonosWatchers) {
            const interval = this.sonosWatchers[watcher].interval
            if (!interval) continue
            clearInterval(interval)
        }
    }

    async start(): Promise<void> {
        this.registerDenonEvents()
        this.denonDevice.instance.connect()

        this.registerSonosWatchers()
    }

    stop(): void {
        this.denonDevice.instance.disconnect()
        this.unregisterSonosWatchers()
    }
}
