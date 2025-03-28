import pino from 'pino'
import config from './config'
import { waitForDenonDevice } from './denon'
import { waitForSonosDevice } from './sonos'
import LinkManager from './LinkManager'
;(async (): Promise<void> => {
    const logger = pino(config.logger)
    const denonDevice = await waitForDenonDevice(config.denon, logger)
    const sonosDevice = await waitForSonosDevice(config.sonos, logger)

    const linkManager = new LinkManager(
        denonDevice,
        sonosDevice,
        config,
        logger
    )
    linkManager.start()
    logger.info('Link manager started')
})()
