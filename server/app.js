import express from 'express'
import cors from 'cors'

import usersRouter from './routes/users.js'
import municipalitiesRouter from './routes/municipalities.js'
import questionsRouter from './routes/questions.js'
import answersRouter from './routes/answers.js'
import indicatorsRouter from './routes/indicators.js'

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/users', usersRouter)
app.use('/api/municipalities', municipalitiesRouter)
app.use('/api/questions', questionsRouter)
app.use('/api/answers', answersRouter)
app.use('/api/indicators', indicatorsRouter)

const listenApp = port => app.listen(port, () => console.log(`Server started on port ${port}`))

export default listenApp