// Module imports
require('dotenv').config()
import { parse as parseIRCMessage } from 'irc-message'





// Local imports
import log from './helpers/log'





// Local constants
const {
  TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET,
  TWITCH_TOKEN,
} = process.env





export default class {
	/***************************************************************************\
		Local Properties
  \***************************************************************************/

  #channels = {}





	/***************************************************************************\
		Private Methods
  \***************************************************************************/

  #handleMessage = message => {
    const parsedMessage = parseIRCMessage(message)

    switch (message) {
      case 'NOTICE':
      case 'USERNOTICE':
        log(parsedMessage.command, parsedMessage)
        break
      case 'PRIVMSG':
      default:
        break
    }
  }

  #joinChannel = channelName => {
    const safeChannelName = channelName.toLowerCase().replace(/^#/, '')

    log(`Joining channel ${safeChannelName}`)

    this.#channels[safeChannelName] = true

    this.socket.send(`JOIN #${safeChannelName}`)
  }

  #partChannel = channelName => {
    const safeChannelName = channelName.toLowerCase().replace(/^#/, '')

    log(`Parting channel ${safeChannelName}`)

    delete this.#channels[safeChannelName]

    this.socket.send(`PART #${safeChannelName}`)
  }





	/***************************************************************************\
		Public Methods
  \***************************************************************************/

  constructor (options) {
    this.options = options

    this.socket.on('open', async () => {
      log('Connection opened with the Twitch IRC service.')

      this.socket.send(`PASS oauth:${TWITCH_TOKEN}`)
      this.socket.send('NICK fdgt-monitor')
      this.socket.send('CAP LS')
      this.socket.send('CAP REQ twitch.tv/commands twitch.tv/membership twitch.tv/tags')

      await this.updateChannels()
    })

    this.socket.on('error', error => log(error, null, 'error'))
    this.socket.on('message', this.handleMessages)
  }

  handleMessages = data => data.split('\r\n').forEach(this.#handleMessage)

  startChannelCheckTimer = () => setTimeout(() => this.updateChannels(), 1000 * 60)

  updateChannels = async () => {
    const response = await fetch('https://api.twitch.tv/helix/streams?first=10', {
      headers: {
        Authorization: `Bearer ${TWITCH_TOKEN}`,
        'Client-ID': TWITCH_CLIENT_ID,
      },
    })
    const { data } = await response.json()
    const channelNames = Object.values(data).map(({ user_name }) => user_name.toLowerCase())

    data.forEach(channel => {
      const {
        user_name: channelName,
      } = channel

      if (!this.#channels[channelName]) {
        this.#joinChannel(channelName)
      }
    })

    Object.keys(this.#channels).forEach(channelName => {
      if (!channelNames.includes(channelName)) {
        this.#partChannel(channelName)
      }
    })

    this.startChannelCheckTimer()
  }





	/***************************************************************************\
		Getters
  \***************************************************************************/

  get socket () {
    return this.options.socket
  }
}
