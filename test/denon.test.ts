import { DenonDevice, Discover } from 'denon-heos'
import * as denon from '../src/denon'
import { DenonConfig } from '../src/types'
import { Logger } from 'pino'

jest.mock('denon-heos', () => ({
    Discover: jest.fn()
}))

describe('denon', () => {
    const mockFetch = jest.fn()
    let mockDenonDevice: DenonDevice
    let mockLogger: Logger

    beforeEach(() => {
        jest.useFakeTimers()
        global.fetch = mockFetch

        mockDenonDevice = {
            address: '10.0.10.30',
            friendlyName: 'Living Room',
            instance: {}
        } as unknown as DenonDevice

        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        } as unknown as Logger
    })

    afterEach(() => {
        jest.clearAllMocks()
        jest.useRealTimers()
    })

    describe('getDenonPid', () => {
        it('should return the PID of the matching player', async () => {
            const mockPlayers = [
                { name: 'Living Room', pid: 1234 },
                { name: 'Bedroom', pid: 5678 }
            ]

            mockDenonDevice.instance.playerGetPlayers = jest
                .fn()
                .mockResolvedValue(mockPlayers)

            const pid = await denon.getDenonPid(mockDenonDevice)
            expect(pid).toBe(1234)
            expect(mockDenonDevice.instance.playerGetPlayers).toHaveBeenCalled()
        })

        it('should throw an error if the player is not found', async () => {
            const mockPlayers = [{ name: 'Bedroom', pid: 5678 }]

            mockDenonDevice.instance.playerGetPlayers = jest
                .fn()
                .mockResolvedValue(mockPlayers)

            await expect(denon.getDenonPid(mockDenonDevice)).rejects.toThrow(
                'Player not found: Living Room (10.0.10.30)'
            )
            expect(mockDenonDevice.instance.playerGetPlayers).toHaveBeenCalled()
        })

        it('should throw an error if no players are returned', async () => {
            mockDenonDevice.instance.playerGetPlayers = jest
                .fn()
                .mockResolvedValue([])

            await expect(denon.getDenonPid(mockDenonDevice)).rejects.toThrow(
                'Player not found: Living Room (10.0.10.30)'
            )
            expect(mockDenonDevice.instance.playerGetPlayers).toHaveBeenCalled()
        })
    })

    describe('getDenonDevice', () => {
        let mockDiscover: jest.Mocked<Discover>

        beforeEach(() => {
            mockDiscover = {
                start: jest.fn(),
                stop: jest.fn(),
                on: jest.fn()
            } as unknown as jest.Mocked<Discover>

            jest.mocked(Discover).mockImplementation(() => mockDiscover)
        })

        it('should return the Denon device when found by IP', async () => {
            const denonConfig: DenonConfig = {
                ip: '10.0.10.30',
                searchTimeout: 5000,
                sonosInterfaceSource: 'CD',
                volumeMultiplier: 1
            }

            mockDiscover.on.mockImplementation(
                (event: 'device', listener: (device: DenonDevice) => void) => {
                    if (event === 'device') listener(mockDenonDevice)
                    return mockDiscover
                }
            )

            const promise = denon.getDenonDevice(denonConfig, mockLogger)

            jest.advanceTimersByTime(100)

            const device = await promise

            expect(device).toEqual(mockDenonDevice)
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Found device: Living Room (10.0.10.30)'
            )
            expect(mockDiscover.start).toHaveBeenCalled()
            expect(mockDiscover.stop).toHaveBeenCalled()
        })

        it('should return undefined if no device is found within the timeout', async () => {
            const denonConfig: DenonConfig = {
                ip: '10.0.10.30',
                searchTimeout: 5000,
                sonosInterfaceSource: 'CD',
                volumeMultiplier: 1
            }

            const promise = denon.getDenonDevice(denonConfig, mockLogger)

            jest.advanceTimersByTime(100_000)

            const device = await promise

            expect(device).toBeUndefined()
            expect(mockDiscover.start).toHaveBeenCalled()
            expect(mockDiscover.stop).toHaveBeenCalled()
        })

        it('should return the Denon device when found by name', async () => {
            const denonConfig: DenonConfig = {
                name: 'Living Room',
                searchTimeout: 5000,
                sonosInterfaceSource: 'CD',
                volumeMultiplier: 1
            }

            mockDiscover.on.mockImplementation(
                (event: 'device', listener: (device: DenonDevice) => void) => {
                    if (event === 'device') listener(mockDenonDevice)
                    return mockDiscover
                }
            )

            const promise = denon.getDenonDevice(denonConfig, mockLogger)

            jest.advanceTimersByTime(100)

            const device = await promise

            expect(device).toEqual(mockDenonDevice)
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Found device: Living Room (10.0.10.30)'
            )
            expect(mockDiscover.start).toHaveBeenCalled()
            expect(mockDiscover.stop).toHaveBeenCalled()
        })
    })

    describe('waitForDenonDevice', () => {
        it('should return the Denon device when found immediately', async () => {
            const denonConfig: DenonConfig = {
                name: 'Living Room',
                searchTimeout: 5000,
                sonosInterfaceSource: 'CD',
                volumeMultiplier: 1
            }

            const getDenonDeviceSpy = jest.spyOn(denon, 'getDenonDevice')
            getDenonDeviceSpy.mockResolvedValueOnce(mockDenonDevice)

            const device = await denon.waitForDenonDevice(
                denonConfig,
                mockLogger
            )

            expect(device).toEqual(mockDenonDevice)
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Looking for Denon device with name: Living Room'
            )
            expect(getDenonDeviceSpy).toHaveBeenCalledTimes(1)
            expect(mockLogger.warn).not.toHaveBeenCalled()

            getDenonDeviceSpy.mockRestore()
        })

        it('should retry until the Denon device is found', async () => {
            const denonConfig: DenonConfig = {
                name: 'Living Room',
                searchTimeout: 5000,
                sonosInterfaceSource: 'CD',
                volumeMultiplier: 1
            }

            const getDenonDeviceSpy = jest.spyOn(denon, 'getDenonDevice')
            getDenonDeviceSpy
                .mockResolvedValueOnce(undefined)
                .mockResolvedValueOnce(mockDenonDevice)

            const promise = denon.waitForDenonDevice(denonConfig, mockLogger)

            // Simulate the retries
            await Promise.resolve()
            jest.advanceTimersByTime(100)
            await Promise.resolve()
            jest.advanceTimersByTime(100)

            const device = await promise

            expect(device).toEqual(mockDenonDevice)
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Looking for Denon device with name: Living Room'
            )
            expect(mockLogger.warn).toHaveBeenCalledTimes(1)
            expect(getDenonDeviceSpy).toHaveBeenCalledTimes(2)

            getDenonDeviceSpy.mockRestore()
            jest.useRealTimers()
        })
    })

    describe('writeDenonVolume', () => {
        it('should send a GET request with the correctly formatted volume', async () => {
            const ipAddress = '10.0.10.30'

            const testCases = [
                { input: 0, expected: '00' },
                { input: 1, expected: '01' },
                { input: 5.5, expected: '055' }, // Includes half-step
                { input: 10, expected: '10' },
                { input: 50, expected: '50' },
                { input: 50.5, expected: '505' }, // Includes half-step
                { input: 98, expected: '98' },
                { input: 99, expected: '98' } // Capped at 98
            ]

            for (const { input, expected } of testCases) {
                mockFetch.mockResolvedValueOnce({ ok: true })

                await denon.writeDenonVolume(ipAddress, input)

                expect(mockFetch).toHaveBeenCalledWith(
                    `${denon.DENON_URI}?MV${expected}`.replace('%s', ipAddress),
                    {
                        method: 'GET',
                        redirect: 'follow'
                    }
                )
            }
        })

        it('should log an error if the fetch request fails', async () => {
            const ipAddress = '10.0.10.30'
            const volume = 50
            const error = new Error('Network error')

            mockFetch.mockRejectedValueOnce(error)

            const consoleErrorSpy = jest
                .spyOn(console, 'error')
                .mockImplementation()

            await denon.writeDenonVolume(ipAddress, volume)

            expect(consoleErrorSpy).toHaveBeenCalledWith(error)

            consoleErrorSpy.mockRestore()
        })
    })

    describe('writeDenonMute', () => {
        it('should send a GET request to mute the device', async () => {
            const ipAddress = '10.0.10.30'
            const mute = true

            mockFetch.mockResolvedValueOnce({ ok: true })

            await denon.writeDenonMute(ipAddress, mute)

            expect(mockFetch).toHaveBeenCalledWith(
                `${denon.DENON_URI}?MUON`.replace('%s', ipAddress),
                {
                    method: 'GET',
                    redirect: 'follow'
                }
            )
        })

        it('should send a GET request to unmute the device', async () => {
            const ipAddress = '10.0.10.30'
            const mute = false

            mockFetch.mockResolvedValueOnce({ ok: true })

            await denon.writeDenonMute(ipAddress, mute)

            expect(mockFetch).toHaveBeenCalledWith(
                `${denon.DENON_URI}?MUOFF`.replace('%s', ipAddress),
                {
                    method: 'GET',
                    redirect: 'follow'
                }
            )
        })

        it('should log an error if the fetch request fails', async () => {
            const ipAddress = '10.0.10.30'
            const mute = true
            const error = new Error('Network error')

            mockFetch.mockRejectedValueOnce(error)

            const consoleErrorSpy = jest
                .spyOn(console, 'error')
                .mockImplementation()

            await denon.writeDenonMute(ipAddress, mute)

            expect(consoleErrorSpy).toHaveBeenCalledWith(error)

            consoleErrorSpy.mockRestore()
        })
    })

    describe('writeDenonSource', () => {
        it('should send a GET request to change the source', async () => {
            const ipAddress = '10.0.10.30'
            const source = 'CD'

            mockFetch.mockResolvedValueOnce({ ok: true })

            await denon.writeDenonSource(ipAddress, source)

            expect(mockFetch).toHaveBeenCalledWith(
                `${denon.DENON_URI}?SICD`.replace('%s', ipAddress),
                {
                    method: 'GET',
                    redirect: 'follow'
                }
            )
        })

        it('should log an error if the fetch request fails', async () => {
            const ipAddress = '10.0.10.30'
            const source = 'CD'
            const error = new Error('Network error')

            mockFetch.mockRejectedValueOnce(error)

            const consoleErrorSpy = jest
                .spyOn(console, 'error')
                .mockImplementation()

            await denon.writeDenonSource(ipAddress, source)

            expect(consoleErrorSpy).toHaveBeenCalledWith(error)

            consoleErrorSpy.mockRestore()
        })
    })

    describe('writeDenonPower', () => {
        it('should send a GET request to power on the device', async () => {
            const ipAddress = '10.0.10.30'
            const power = true

            mockFetch.mockResolvedValueOnce({ ok: true })

            await denon.writeDenonPower(ipAddress, power)

            expect(mockFetch).toHaveBeenCalledWith(
                `${denon.DENON_URI}?PWON`.replace('%s', ipAddress),
                {
                    method: 'GET',
                    redirect: 'follow'
                }
            )
        })

        it('should send a GET request to put the device in standby', async () => {
            const ipAddress = '10.0.10.30'
            const power = false

            mockFetch.mockResolvedValueOnce({ ok: true })

            await denon.writeDenonPower(ipAddress, power)

            expect(mockFetch).toHaveBeenCalledWith(
                `${denon.DENON_URI}?PWSTANDBY`.replace('%s', ipAddress),
                {
                    method: 'GET',
                    redirect: 'follow'
                }
            )
        })

        it('should log an error if the fetch request fails', async () => {
            const ipAddress = '10.0.10.30'
            const power = true
            const error = new Error('Network error')

            mockFetch.mockRejectedValueOnce(error)

            const consoleErrorSpy = jest
                .spyOn(console, 'error')
                .mockImplementation()

            await denon.writeDenonPower(ipAddress, power)

            expect(consoleErrorSpy).toHaveBeenCalledWith(error)

            consoleErrorSpy.mockRestore()
        })
    })
})
