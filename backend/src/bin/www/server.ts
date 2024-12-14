import app from '../../index'
import dotenv from 'dotenv'

dotenv.config()

const port = process.env.PORT || 3000

app.listen(port, () => {
  console.log(`✨ Server avviato con successo!`)
  console.log(`🚀 Server disponibile su: http://localhost:${port}`)
  console.log(`📁 API endpoint: http://localhost:${port}/api/files`)
})


