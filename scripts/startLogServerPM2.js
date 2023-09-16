// eslint-disable-next-line @typescript-eslint/no-var-requires
const pm2 = require('pm2')

const count = parseInt(process.argv[2]) || 1
const startingPort = +process.argv[3] || 7440

console.log(`LogServer PM2: Starting ${count} from port:${startingPort}`)

pm2.connect(function (err) {
  if (err) {
    console.error(err)
    process.exit(2)
  }

  for (let i = 0; i < count; i++) {
    startLogServer(startingPort + i)
  }
  setTimeout(() => {
    console.log(`Run "pm2 list" to see started processes.`)
    process.exit(0)
  }, 3000)
  return
})

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function startLogServer(port) {
  const processName = 'log_server_' + port
  pm2.start(
    {
      script: './dist/log_server.js',
      name: processName,
      env: {
        LOG_SERVER_PORT: port.toString(),
      },
    },
    function (err) {
      if (err) {
        console.error(err)
        pm2.restart(processName, () => {
          pm2.disconnect()
        })
        return
      } else {
        console.log(`Started Log Server at port ${port}`)
      }
    }
  )
}
