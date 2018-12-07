module.exports = function Relog(mod) {
  let characters = []
  let position = -1

  mod.command.add('relog', arg => {
    if (!mod.game.me.alive || mod.game.me.status !== 0) {
      mod.command.message(`isn't state you can relog`)
      return
    }

    if (arg === 'nx') {
      if (++position > characters.length)
        position = 1
    } else if (/^\d+$/.test(arg)) {
      const nextPosition = Number(arg)
      if (nextPosition > characters.length) {
        mod.command.message(`Not found ${nextPosition}th character`)
        return
      } else {
        position = nextPosition
      }
    } else {
      const found = characters.find(char => char.name.toLowerCase() === arg.toLowerCase())
      if (found) {
        position = found.position
      } else {
        mod.command.message(`Not found '${arg}'`)
        return
      }
    }

    relog()
  })

  // Grab the user list the first time the client sees the lobby
  mod.hook('S_GET_USER_LIST', 14, event => {
    characters = event.characters
  })

  // Keep track of current char for relog nx
  mod.hook('C_SELECT_USER', 1, event => {
    position = characters.find(char => char.id === event.id).position
  })
  
  function relog() {
    mod.toServer('C_RETURN_TO_LOBBY', 1, {})
    let lobbyHook

    // make sure that the client is able to log out
    const prepareLobbyHook = mod.hookOnce('S_PREPARE_RETURN_TO_LOBBY', 1, () => {
      mod.toClient('S_RETURN_TO_LOBBY', 1, {})

      // the server is ready to relog to a new character
      lobbyHook = mod.hookOnce('S_RETURN_TO_LOBBY', 1, () => {
        process.nextTick(() => {
          const charId = characters.find(char => char.position === position).id
          mod.toServer('C_SELECT_USER', 1, {id: charId, unk: 0})
        })
      })
    })

    // hook timeout, in case something goes wrong
    setTimeout(() => {
      for (const hook of [prepareLobbyHook, lobbyHook])
        if (hook)
          mod.unhook(hook)
    }, 16000)
  }
}
