declare module 'sonos' {
    export interface SonosDeviceDescription {
        deviceType: string
        friendlyName: string
        manufacturer: string
        manufacturerURL: string
        modelNumber: string
        modelDescription: string
        modelName: string
        modelURL: string
        softwareVersion: string
        swGen: string
        hardwareVersion: string
        serialNum: string
        MACAddress: string
        UDN: string
        iconList: {
            icon: {
                id: string
                mimetype: string
                width: string
                height: string
                depth: string
                url: string
            }
        }
        minCompatibleVersion: string
        legacyCompatibleVersion: string
        apiVersion: string
        minApiVersion: string
        displayVersion: string
        extraVersion: string
        nsVersion: string
        versions: {
            audioTxProtocol: { version: string }
            htAudioTxProtocol: { version: string }
        }
        roomName: string
        displayName: string
        zoneType: string
        feature1: string
        feature2: string
        feature3: string
        seriesid: string
        variant: string
        internalSpeakerSize: string
        memory: string
        flash: string
        flashRepartitioned: string
        ampOnTime: string
        retailMode: string
        SSLPort: string
        securehhSSLPort: string
        serviceList: {
            service: Array<{
                serviceType: string
                serviceId: string
                controlURL: string
                eventSubURL: string
                SCPDURL: string
            }>
        }
        deviceList: {
            device: Array<{
                'deviceType': string
                'friendlyName': string
                'manufacturer': string
                'manufacturerURL': string
                'modelNumber': string
                'modelDescription': string
                'modelName': string
                'modelURL': string
                'UDN': string
                'serviceList': {
                    service: Array<{
                        serviceType: string
                        serviceId: string
                        controlURL: string
                        eventSubURL: string
                        SCPDURL: string
                    }>
                }
                'X_Rhapsody-Extension'?: {
                    xmlns: string
                    deviceID: string
                    deviceCapabilities: {
                        interactionPattern: { type: string }
                    }
                }
                'qq:X_QPlay_SoftwareCapability'?: {
                    '_': string
                    'xmlns:qq': string
                }
                'iconList'?: {
                    icon: {
                        mimetype: string
                        width: string
                        height: string
                        depth: string
                        url: string
                    }
                }
            }>
        }
    }

    export interface SonosOptions {
        endpoints?: {
            transport?: string
            rendering?: string
            device?: string
        }
        spotify?: {
            region?: string
        }
    }

    export interface MusicLibraryItem {
        title: string
        uri: string
    }

    export interface MusicLibraryResult {
        returned: string
        total: string
        items: MusicLibraryItem[]
    }

    export class AsyncDeviceDiscovery {
        constructor()
        discover({ timeout }: { timeout?: number }): Sonos
        discoverMultiple({ timeout }: { timeout?: number }): Sonos[]
    }

    export class Sonos extends EventEmitter {
        constructor(host: string, port?: number, options?: SonosOptions)

        host: string
        port: number
        options: SonosOptions

        getMusicLibrary(
            searchType: string,
            options?: { start?: number; total?: number }
        ): Promise<MusicLibraryResult>

        searchMusicLibrary(
            searchType: string,
            searchTerm?: string,
            requestOptions?: { start?: number; total?: number },
            separator?: string
        ): Promise<MusicLibraryResult>

        getPlaylist(
            playlistId: string,
            requestOptions?: { start?: number; total?: number }
        ): Promise<MusicLibraryResult>

        createPlaylist(title: string): Promise<{
            NumTracksAdded: number
            NewQueueLength: number
            NewUpdateID: number
            AssignedObjectID: string | null
        }>

        deletePlaylist(playlistId: string): Promise<boolean>

        addToPlaylist(
            playlistId: string,
            uri: string
        ): Promise<{
            NumTracksAdded: number
            NewQueueLength: number
            NewUpdateID: number
        }>

        removeFromPlaylist(
            playlistId: string,
            index: string
        ): Promise<{
            QueueLengthChange: number
            NewQueueLength: number
            NewUpdateID: number
        }>

        getFavorites(): Promise<MusicLibraryResult>

        currentTrack(): Promise<{
            id?: string | null
            parentID?: string | null
            title?: string
            artist?: string
            album?: string
            albumArtist?: string | null
            albumArtURI?: string
            position: number
            duration: number
            albumArtURL?: string
            uri: string
            queuePosition: number
        }>

        getVolume(): Promise<number>

        getMuted(): Promise<boolean>

        play(options?: string | object): Promise<boolean>

        setAVTransportURI(options: string | object): Promise<boolean>

        stop(): Promise<boolean>

        getAllGroups(): Promise<object[]>

        becomeCoordinatorOfStandaloneGroup(): Promise<boolean>

        leaveGroup(): Promise<boolean>

        joinGroup(otherDeviceName: string): Promise<boolean>

        pause(): Promise<boolean>

        seek(seconds: number): Promise<boolean>

        selectTrack(trackNr: number): Promise<boolean>

        next(): Promise<boolean>

        previous(): Promise<boolean>

        selectQueue(): Promise<boolean>

        playTuneinRadio(
            stationId: string,
            stationTitle?: string
        ): Promise<boolean>

        playSpotifyRadio(
            artistId: string,
            artistName?: string
        ): Promise<boolean>

        queue(
            options: string | object,
            positionInQueue?: number
        ): Promise<object>

        removeTracksFromQueue(
            startIndex: number,
            numberOfTracks?: number
        ): Promise<object>

        flush(): Promise<object>

        getLEDState(): Promise<string>

        setLEDState(newState: string): Promise<boolean>

        getZoneInfo(): Promise<{
            SerialNumber: string
            SoftwareVersion: string
            DisplaySoftwareVersion: string
            HardwareVersion: string
            IPAddress: string
            MACAddress: string
            CopyrightInfo: string
            ExtraInfo: string
            HTAudioIn: string
            Flags: string
        }>

        getZoneAttrs(): Promise<{
            CurrentZoneName: string
            CurrentIcon: string
            CurrentConfiguration: string
            CurrentTargetRoomName: string
        }>

        deviceDescription(): Promise<SonosDeviceDescription>

        setName(name: string): Promise<Record<string, never>>

        getName(): Promise<string>

        getPlayMode(): Promise<string>

        setPlayMode(playmode: string): Promise<Record<string, never>>

        setVolume(
            volume: number,
            channel?: string
        ): Promise<Record<string, never>>

        adjustVolume(
            volumeAdjustment: number,
            channel?: string
        ): Promise<number>

        configureSleepTimer(sleepTimerDuration: string): Promise<object>

        setMuted(
            muted: boolean,
            channel?: string
        ): Promise<Record<string, never>>

        getBalance(): Promise<number>

        setBalance(balance: number): Promise<void>

        getTopology(): Promise<{
            zones: unkown[]
            mediaServers: unknown[]
        }>

        getCurrentState(): Promise<'playing' | 'paused' | 'stopped'>

        togglePlayback(): Promise<boolean>

        getFavoritesRadioStations(options?: {
            start?: number
            total?: number
        }): Promise<MusicLibraryResult>

        getFavoritesRadioShows(options?: {
            start?: number
            total?: number
        }): Promise<MusicLibraryResult>

        getFavoritesRadio(
            favoriteRadioType: string,
            requestOptions?: { start?: number; total?: number }
        ): Promise<MusicLibraryResult>

        setSpotifyRegion(region: string): void

        getQueue(): Promise<MusicLibraryResult>

        playNotification(options: {
            uri: string
            metadata?: string
            onlyWhenPlaying?: boolean
            volume?: number
        }): Promise<boolean>

        reorderTracksInQueue(
            startingIndex: number,
            numberOfTracks: number,
            insertBefore: number,
            updateId?: number
        ): Promise<boolean>

        getSpotifyConnectInfo(): Promise<object>
    }

    // export const DeviceDiscovery: any;
    // export const AsyncDeviceDiscovery: any;
    // export const Helpers: any;
    // export const Services: any;
    // export const Listener: any;
    export const SpotifyRegion: {
        EU: string
        US: string
    }
}
