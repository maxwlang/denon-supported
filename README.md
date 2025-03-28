# Denon Supported

Denon Sup**port**ed enables Sonos Port devices to control the volume level of connected Denon AVR systems that do not respect the coaxial volume passthrough settings. You see this behavior on AVR systems that do not have the "works with Sonos" moniker.

## Setup

Setup is simple, configure with environment variables, examples are in the [.envrc.sample](./envrc.sample) file.

1. Locate the name or IP address of your Denon AVR and provide one of them in the respective env variable `DENON_NAME` or `DENON_IP`. If both are provided, the IP address will take priority.
2. Add the name of the Denon's Sonos input to the config using the `DENON_SONOS_INPUT_SOURCE` environment variable. This is not what you rename the source to, but what it is named by default. I use `CD`.
3. Locate the name or IP address of your Sonos Port and provide one of them in the respective env variable `SONOS_NAME` or `SONOS_IP`. If both are provided, the IP address will take priority.
4. Run the program
