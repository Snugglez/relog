module.exports = function Relog(mod) {
  let characters = []
  let charIndex = -1

  mod.command.add('relog', arg => {
    if (arg === 'nx') {
      if (++charIndex === characters.length)
        charIndex = 0
    } else if (/^\d+$/.test(arg)) {
      const nextCharIndex = Number(arg)
      if (nextCharIndex >= characters.length) {
        mod.command.message(`Not found ${nextCharIndex}th character`)
        return
      } else {
        charIndex = nextCharIndex - 1
      }
    } else {
      let nextCharIndex = -1

      for (let i=0; i<characters.length; i++) {
        if (characters[i].name.toLowerCase() === arg.toLowerCase()) {
          nextCharIndex = i
          break
        }
      }

      if (nextCharIndex < 0) {
        mod.command.message(`Not found '${arg}'`)
        return
      } else {
        charIndex = nextCharIndex
      }
    }

    relog(characters[charIndex].id)
  })

  // Grab the user list the first time the client sees the lobby
  mod.hook('S_GET_USER_LIST', 14, event => {
    characters = event.characters
  })

  // Keep track of current char for relog nx
  mod.hook('C_SELECT_USER', 1, event => {
    for (let i=0; i<characters.length; i++) {
      if (characters[i].id === event.id) {
        charIndex = i
        break
      }
    }
  })
  
  function relog(id) {
    mod.toServer('C_RETURN_TO_LOBBY', 1, {})
    let lobbyHook

    // make sure that the client is able to log out
    const prepareLobbyHook = mod.hookOnce('S_PREPARE_RETURN_TO_LOBBY', 1, () => {
      mod.toClient('S_RETURN_TO_LOBBY', 1, {})

      // the server is ready to relog to a new character
      lobbyHook = mod.hookOnce('S_RETURN_TO_LOBBY', 1, () => {
        process.nextTick(() => mod.toServer('C_SELECT_USER', 1, {id: id,unk: 0}))
      })
    })

    // hook timeout, in case something goes wrong
    setTimeout(() => {
      for (const hook of [prepareLobbyHook, lobbyHook]) {
        if (hook)
          mod.unhook(hook)
      }
    }, 16000)
  }
}
