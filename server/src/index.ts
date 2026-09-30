import 'dotenv/config'
import { createApp } from './app'
import { config } from './config'
import { ensureMonitorTables, ensureUserColumns } from './ensureMonitor'

const app = createApp()

ensureUserColumns()
  .then(() => ensureMonitorTables())
  .then(() => {
    app.listen(config.port, () => {
      console.log(`server listening on http://127.0.0.1:${config.port}`)
    })
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
