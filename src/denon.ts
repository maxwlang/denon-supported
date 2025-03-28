import { Discover } from 'denon-heos'
import { DenonDevice } from './@types/denon-heos'
import { DenonConfig } from './types'
import { Logger } from 'pino'

export const DENON_URI = 'http://%s:8080/goform/formiPhoneAppDirect.xml'

export const getDenonPid = async (
    denonDevice: DenonDevice
): Promise<number> => {
    const players = await denonDevice.instance.playerGetPlayers()
    const player = players.find(
        player => player.name === denonDevice.friendlyName
    )

    if (!player) {
        throw new Error(
            `Player not found: ${denonDevice.friendlyName} (${denonDevice.address})`
        )
    }

    return player.pid
}

export const getDenonDevice = async (
    denonConfig: DenonConfig,
    logger: Logger
): Promise<DenonDevice | undefined> => {
    const discover = new Discover()

    let denonDevice: DenonDevice | undefined

    discover.on('device', (device: DenonDevice) => {
        if (
            (denonConfig.ip && device.address == denonConfig.ip) ||
            (denonConfig.name && device.friendlyName == denonConfig.name)
        ) {
            logger.info(
                `Found device: ${device.friendlyName} (${device.address})`
            )
            denonDevice = device
        }
    })

    return new Promise(resolve => {
        discover.start()
        const interval = setInterval(() => {
            if (denonDevice) {
                clearInterval(interval)
                discover.stop()
                resolve(denonDevice)
            }
        }, 100)

        setTimeout(() => {
            clearInterval(interval)
            discover.stop()
            if (!denonDevice) {
                resolve(undefined)
            }
        }, denonConfig.searchTimeout)
    })
}

export const waitForDenonDevice = async (
    denonConfig: DenonConfig,
    logger: Logger
): Promise<DenonDevice> => {
    let denonDevice: DenonDevice | undefined
    logger.info(`Looking for Denon device with name: ${denonConfig.name}`)
    while (!denonDevice) {
        denonDevice = await getDenonDevice(denonConfig, logger)
        if (!denonDevice) {
            logger.warn('Denon device not found, retrying...')
            await new Promise(resolve => setTimeout(resolve, 100))
        }
    }
    return denonDevice
}

const formatVolume = (input: number): string => {
    // Coerce anything over 98 to 98
    const capped = Math.min(input, 98)

    const base = Math.floor(capped)
    const decimal = capped - base

    const isHalf = decimal > 0
    let result = base.toString().padStart(2, '0')

    if (isHalf) result += '5'

    return result
}

export const writeDenonVolume = async (
    ipAddress: string,
    volume: number
): Promise<void> => {
    const formattedVolume = formatVolume(volume)
    await fetch(`${DENON_URI}?MV${formattedVolume}`.replace('%s', ipAddress), {
        method: 'GET',
        redirect: 'follow'
    }).catch(error => console.error(error))
}

export const writeDenonMute = async (
    ipAddress: string,
    mute: boolean
): Promise<void> => {
    await fetch(
        `${DENON_URI}?MU${mute ? 'ON' : 'OFF'}`.replace('%s', ipAddress),
        {
            method: 'GET',
            redirect: 'follow'
        }
    ).catch(error => console.error(error))
}

export const writeDenonSource = async (
    ipAddress: string,
    source: string
): Promise<void> => {
    await fetch(`${DENON_URI}?SI${source}`.replace('%s', ipAddress), {
        method: 'GET',
        redirect: 'follow'
    }).catch(error => console.error(error))
}

export const writeDenonPower = async (
    ipAddress: string,
    power: boolean
): Promise<void> => {
    await fetch(
        `${DENON_URI}?PW${power ? 'ON' : 'STANDBY'}`.replace('%s', ipAddress),
        {
            method: 'GET',
            redirect: 'follow'
        }
    ).catch(error => console.error(error))
}
