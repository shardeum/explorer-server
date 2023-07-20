// eslint-disable-next-line @typescript-eslint/no-var-requires
const pm2 = require('pm2')

const count = parseInt(process.argv[2]) || 1
const startingPort = +process.argv[3] || 7440

console.log(`Distributor PM2: Starting ${count} from port:${startingPort}`)

pm2.connect(function (err) {
  if (err) {
    console.error(err)
    process.exit(2)
  }

  for (let i = 0; i < count; i++) {
    startDistributor(startingPort + i)
  }
  setTimeout(() => {
    console.log(`Run "pm2 list" to see started processes.`)
    process.exit(0)
  }, 3000)
  return
})

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function startDistributor(port) {
  const processName = 'distributor_' + port
  pm2.start(
    {
      script: './dist/distributor.js',
      name: processName,
      env: {
        DISTRIBUTOR_PORT: port.toString(),
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
        console.log(`Started distributor server at port ${port}`)
      }
    }
  )
}
