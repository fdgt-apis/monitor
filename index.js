// Module imports
import 'isomorphic-fetch'
import WebSocket from 'ws'





// Local imports
import Monitor from './Monitor'





// Local constants
const socket = new WebSocket('ws://irc-ws.chat.twitch.tv')
const monitor = new Monitor({ socket })
