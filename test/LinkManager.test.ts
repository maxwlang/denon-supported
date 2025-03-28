import { jest } from '@jest/globals'
import LinkManager from '../src/LinkManager'
import { DenonDevice, DenonHeosEvent } from 'denon-heos'
import { Sonos } from 'sonos'
import { Logger } from 'pino'
import { Config } from '../src/types'
import * as denonMethods from '../src/denon'

// Mock the denon methods globally
jest.mock('../src/denon', () => ({
    writeDenonMute: jest.fn(),
    writeDenonPower: jest.fn(),
    writeDenonSource: jest.fn(),
    writeDenonVolume: jest.fn(),
    getDenonPid: jest.fn()
}))

describe('LinkManager', () => {
    let denonDevice: DenonDevice
    let sonosDevice: Sonos
    let config: Config
    let logger: Logger
    let linkManager: LinkManager

    beforeEach(() => {
        jest.useFakeTimers()
        denonDevice = {
            instance: {
                on: jest.fn(),
                connect: jest.fn(),
                disconnect: jest.fn()
            },
            address: '10.0.10.30'
        } as unknown as DenonDevice

        sonosDevice = new Sonos('10.0.10.20')

        jest.spyOn(sonosDevice, 'getVolume').mockResolvedValue(50)
        jest.spyOn(sonosDevice, 'setVolume').mockResolvedValue({})
        jest.spyOn(sonosDevice, 'getMuted').mockResolvedValue(false)
        jest.spyOn(sonosDevice, 'setMuted').mockResolvedValue({})
        jest.spyOn(sonosDevice, 'getCurrentState').mockResolvedValue('paused')

        config = {
            denon: {
                sonosInterfaceSource: 'CD'
            },
            volumeMultiplier: 1
        } as Config

        logger = {
            info: jest.fn(),
            debug: jest.fn(),
            trace: jest.fn(),
            error: jest.fn()
        } as unknown as Logger

        linkManager = new LinkManager(denonDevice, sonosDevice, config, logger)
    })

    afterEach(() => {
        jest.clearAllMocks()
        jest.useRealTimers()
    })

    describe('Denon Events', () => {
        it('should register Denon events and connect the Denon device on start', async () => {
            await linkManager.start()

            expect(denonDevice.instance.on).toHaveBeenCalledWith(
                'disconnected',
                expect.any(Function)
            )
            expect(denonDevice.instance.on).toHaveBeenCalledWith(
                'connected',
                expect.any(Function)
            )
            expect(denonDevice.instance.on).toHaveBeenCalledWith(
                'connecting',
                expect.any(Function)
            )
            expect(denonDevice.instance.on).toHaveBeenCalledWith(
                'event',
                expect.any(Function)
            )
            expect(denonDevice.instance.connect).toHaveBeenCalled()
        })

        it('should disconnect the Denon device on stop', async () => {
            await linkManager.start()
            await linkManager.stop()

            expect(denonDevice.instance.disconnect).toHaveBeenCalled()
        })

        it('should handle registered Denon events', async () => {
            const eventListeners: Record<
                string,
                (event: DenonHeosEvent) => void
            > = {}
            denonDevice.instance.on = jest.fn(
                (event: string, listener: (event: DenonHeosEvent) => void) => {
                    eventListeners[event] = listener
                    return denonDevice.instance
                }
            )

            linkManager['registerDenonEvents']()

            // Disconnected
            eventListeners['disconnected']({
                event: 'disconnected',
                message: {}
            })

            expect(logger.error).toHaveBeenCalledWith(
                'Denon device disconnected'
            )

            // Connected
            jest.spyOn(denonMethods, 'getDenonPid').mockResolvedValue(123)

            await eventListeners['connected']({
                event: 'connected',
                message: {}
            })

            expect(logger.info).toHaveBeenCalledWith('Denon device connected')
            expect(linkManager['denonPid']).toBe(123)

            // Connecting
            eventListeners['connecting']({
                event: 'connecting',
                message: {}
            })

            expect(logger.info).toHaveBeenCalledWith('Denon device connecting')
        })
    })

    describe('Sonos Watchers', () => {
        it('should register Sonos watchers on start', async () => {
            await linkManager.start()

            expect(linkManager['sonosWatchers']).toBeDefined()
            expect(linkManager['sonosWatchers'].level).toBeDefined()
            expect(linkManager['sonosWatchers'].mute).toBeDefined()
            expect(linkManager['sonosWatchers'].playState).toBeDefined()
        })
        it('should unregister Sonos watchers on stop', async () => {
            jest.spyOn(global, 'clearInterval')

            linkManager['sonosWatchers'] = {
                volume: {
                    interval: setInterval(() => {}, 1000),
                    lastValue: null
                },
                mute: {
                    interval: setInterval(() => {}, 1000),
                    lastValue: null
                },
                playState: {
                    interval: setInterval(() => {}, 1000),
                    lastValue: null
                }
            }

            await linkManager.stop()
            expect(clearInterval).toHaveBeenCalledTimes(3)
        })
    })

    describe('Syncing', () => {
        it('should sync Denon volume when Sonos volume changes', async () => {
            linkManager['denonPid'] = 1
            linkManager['registerSonosWatchers']()

            // Simulate a change in Sonos volume
            jest.spyOn(sonosDevice, 'getVolume')
                .mockResolvedValueOnce(50)
                .mockResolvedValueOnce(60)

            jest.advanceTimersByTime(250)

            linkManager['sonosWatchers']['level'].lastValue = 50

            jest.advanceTimersByTime(250)
            await Promise.resolve()

            expect(sonosDevice.getVolume).toHaveBeenCalledTimes(2)
            expect(denonMethods.writeDenonVolume).toHaveBeenCalledWith(
                linkManager['denonDevice'].address,
                60
            )
        })

        it('should sync Denon mute when Sonos mute changes', async () => {
            linkManager['denonPid'] = 1
            linkManager['registerSonosWatchers']()

            // Simulate a change in Sonos mute state
            jest.spyOn(sonosDevice, 'getMuted').mockResolvedValue(true)

            jest.advanceTimersByTime(250)

            await Promise.resolve()

            expect(sonosDevice.getMuted).toHaveBeenCalledTimes(1)
            expect(denonMethods.writeDenonMute).toHaveBeenCalledWith(
                linkManager['denonDevice'].address,
                true
            )
        })

        it('should turn on Denon and switch input when Sonos starts playing', async () => {
            linkManager['denonPid'] = 1
            linkManager['registerSonosWatchers']()

            // Simulate a change in Sonos play state
            jest.spyOn(sonosDevice, 'getCurrentState').mockResolvedValue(
                'playing'
            )

            jest.advanceTimersByTime(250)

            await Promise.resolve()

            expect(sonosDevice.getCurrentState).toHaveBeenCalledTimes(1)
            expect(denonMethods.writeDenonPower).toHaveBeenCalledWith(
                linkManager['denonDevice'].address,
                true
            )
            await Promise.resolve()
            expect(denonMethods.writeDenonSource).toHaveBeenCalledWith(
                linkManager['denonDevice'].address,
                config.denon.sonosInterfaceSource
            )
        })

        it('should sync Sonos volume when Denon volume changes', async () => {
            linkManager['denonPid'] = 1
            linkManager['registerDenonEvents']()

            // Simulate a change in Denon volume
            const event = {
                event: 'player_volume_changed',
                message: {
                    mute: 'off',
                    level: 60
                }
            } as DenonHeosEvent

            await linkManager['handleDenonEvent'](event)

            expect(sonosDevice.setVolume).toHaveBeenCalledWith(60)
        })

        it('should sync Sonos mute when Denon mute changes', async () => {
            linkManager['denonPid'] = 1
            linkManager['registerDenonEvents']()

            // Simulate a change in Denon mute state
            const event = {
                event: 'player_volume_changed',
                message: {
                    mute: 'on',
                    level: 50
                }
            } as DenonHeosEvent

            await linkManager['handleDenonEvent'](event)

            expect(sonosDevice.setMuted).toHaveBeenCalledWith(true)
        })

        it('should not sync Sonos volume if Denon PID is not set', async () => {
            linkManager['denonPid'] = null
            linkManager['registerDenonEvents']()

            // Simulate a change in Denon volume
            const event = {
                event: 'player_volume_changed',
                message: {
                    mute: 'off',
                    level: 60
                }
            } as DenonHeosEvent

            await linkManager['handleDenonEvent'](event)

            expect(sonosDevice.setVolume).not.toHaveBeenCalled()
        })

        it('should not sync Denon volume if Denon PID is not set', async () => {
            linkManager['denonPid'] = null
            linkManager['registerSonosWatchers']()

            // Simulate a change in Sonos volume
            jest.spyOn(sonosDevice, 'getVolume')
                .mockResolvedValueOnce(50)
                .mockResolvedValueOnce(60)

            jest.advanceTimersByTime(250)

            linkManager['sonosWatchers']['level'].lastValue = 50

            jest.advanceTimersByTime(250)
            await Promise.resolve()

            expect(sonosDevice.getVolume).toHaveBeenCalledTimes(2)
            expect(denonMethods.writeDenonVolume).not.toHaveBeenCalled()
        })

        it('should not sync Denon mute if Denon PID is not set', async () => {
            linkManager['denonPid'] = null
            linkManager['registerSonosWatchers']()

            // Simulate a change in Sonos mute state
            jest.spyOn(sonosDevice, 'getMuted').mockResolvedValue(true)

            jest.advanceTimersByTime(250)

            await Promise.resolve()

            expect(sonosDevice.getMuted).toHaveBeenCalledTimes(1)
            expect(denonMethods.writeDenonMute).not.toHaveBeenCalled()
        })
    })
})
