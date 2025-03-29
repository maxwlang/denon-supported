import { Logger } from 'pino'
import * as sonos from '../src/sonos'
import { AsyncDeviceDiscovery, Sonos } from 'sonos'
import { SonosConfig } from '../src/types'

jest.mock('sonos', () => ({
    AsyncDeviceDiscovery: jest.fn(),
    Sonos: jest.fn()
}))

describe('sonos', () => {
    const logger = {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    } as unknown as Logger

    const mockSonosDevice = {
        host: '10.0.10.20',
        port: 1400,
        options: {},
        getMusicLibrary: jest.fn(),
        searchMusicLibrary: jest.fn(),
        getName: jest.fn().mockResolvedValue('Living Room')
    } as unknown as Sonos

    const mockDiscoveryService = {
        discoverMultiple: jest.fn(),
        discover: jest.fn()
    }

    const sonosConfig: SonosConfig = {
        ip: '10.0.10.20',
        searchTimeout: 5000,
        volumeMultiplier: 1
    }

    beforeEach(() => {
        jest.useFakeTimers()
        jest.mocked(AsyncDeviceDiscovery).mockImplementation(
            () => mockDiscoveryService
        )
    })

    afterEach(() => {
        jest.clearAllMocks()
        jest.useRealTimers()
    })

    describe('getSonosDevice', () => {
        it('should return the Sonos device when found by IP', async () => {
            mockDiscoveryService.discoverMultiple.mockResolvedValue([
                mockSonosDevice
            ])

            const device = await sonos.getSonosDevice(sonosConfig, logger)

            expect(device).toEqual(mockSonosDevice)
            expect(mockSonosDevice.getName).toHaveBeenCalled()
            expect(logger.info).toHaveBeenCalledWith(
                'Found device: Living Room (10.0.10.20)'
            )
        })

        it('should return the Sonos device when found by name', async () => {
            mockDiscoveryService.discoverMultiple.mockResolvedValue([
                mockSonosDevice
            ])

            const device = await sonos.getSonosDevice(sonosConfig, logger)

            expect(device).toEqual(mockSonosDevice)
            expect(mockSonosDevice.getName).toHaveBeenCalled()
            expect(logger.info).toHaveBeenCalledWith(
                'Found device: Living Room (10.0.10.20)'
            )
        })

        it('should return undefined when no matching device is found', async () => {
            mockDiscoveryService.discoverMultiple.mockResolvedValue([
                mockSonosDevice
            ])

            const sonosConfig: SonosConfig = {
                name: 'Kitchen',
                searchTimeout: 5000,
                volumeMultiplier: 1
            }
            const device = await sonos.getSonosDevice(sonosConfig, logger)

            expect(device).toBeUndefined()
            expect(mockSonosDevice.getName).toHaveBeenCalled()
            expect(logger.warn).not.toHaveBeenCalled()
        })
    })

    describe('waitForSonosDevice', () => {
        it('should return the Sonos device when found', async () => {
            const getSonosDeviceSpy = jest.spyOn(sonos, 'getSonosDevice')
            getSonosDeviceSpy.mockResolvedValueOnce(mockSonosDevice)

            const sonosDevice = await sonos.waitForSonosDevice(
                sonosConfig,
                logger
            )

            jest.runAllTimers()
            await expect(sonosDevice).toEqual(mockSonosDevice)

            getSonosDeviceSpy.mockRestore()
        })

        it('should retry until the device is found', async () => {
            const getSonosDeviceSpy = jest.spyOn(sonos, 'getSonosDevice')
            getSonosDeviceSpy
                .mockResolvedValueOnce(undefined)
                .mockResolvedValueOnce(mockSonosDevice)

            const sonosDevicePromise = sonos.waitForSonosDevice(
                sonosConfig,
                logger
            )

            // Run the first iteration of the loop (device not found)
            await Promise.resolve()
            jest.advanceTimersByTime(100)
            expect(logger.warn).toHaveBeenCalledWith(
                'Sonos device not found, retrying...'
            )

            // Run the second iteration of the loop (device found)
            await Promise.resolve()

            await expect(sonosDevicePromise).resolves.toEqual(mockSonosDevice)

            getSonosDeviceSpy.mockRestore()
        })
    })
})
