import Answer from '../models/Answer.js'
import Question from '../models/Question.js'
import Municipality from '../models/Municipality.js'
import User from '../models/User.js'

import groupArrayByField from '../utils/groupArrayByField.js'
import countAnswerResult from '../utils/countAnswerResult.js'
import getMunicipalityName from '../utils/getMunicipalityName.js'
import getYear from '../utils/getYear.js'

export const sendQuiz = async (req, res) => {
  try {
    const answers = req.body
    const year = +new Date(answers[0].date).getFullYear()
    const municipality = answers[0].municipality

    await Answer.deleteMany({
      municipality,
      date: { $gt: new Date(`${year}-01-01T00:00:00`), $lt: new Date(`${year + 1}-01-01T00:00:00`) }
    })

    await Answer.insertMany(answers)
    return res.json(answers)
  } catch (e) {
    console.log(e)
    return res.status(500).json({ message: 'Серверная ошибка' })
  }
}

export const getShortInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if(!user)
      return res.status(403).json({ message: 'Недостаточно доступа для выполнения операции' })

    const { municipality, date, sort } = req.query

    const filters = {
      municipality,
      date
    }

    if(filters.date)
      filters.date = { $gt: new Date(date), $lt: new Date((+date + 1).toString()) }

    const query = Object.keys(filters).reduce((obj, key) => filters[key] ? { ...obj, [key]: filters[key] } : obj, {})

    const answers = await Answer.find(query)
    const questions = await Question.find()
    const municipalities = await Municipality.find()

    const groupedByMunicipality = groupArrayByField(answers, 'municipality')

    const groupedByDate = groupedByMunicipality
      .map(quiz => groupArrayByField(quiz, 'date'))
      .flat()

    const counted = groupedByDate.map(quiz => {
      return quiz.map(answer => {
        const question = questions.find(question => question._id.toString() === answer.question.toString())
        const { _id } = answer
        const { type, number, indicator } = question

        const obj = {
          _id,
          number,
          indicator
        }

        return countAnswerResult(answer, type, obj)
      })
    })

    const mapped = counted.map((quiz, index) => {
      const { municipality, date } = groupedByDate[index][0]
      return {
        municipality,
        date,
        answers: quiz.sort((a, b) => a.number > b.number ? 1 : -1)
      }
    })

    const result = mapped.sort((a, b) => {
      switch(sort) {
        case 'date':
          return a.date < b.date ? 1 : -1

        case 'municipality':
          return getMunicipalityName(municipalities, a.municipality) > getMunicipalityName(municipalities, b.municipality) ? 1 : -1

        default:
          return null
      }
    })

    return res.json(result)
  } catch (e) {
    console.log(e)
    return res.status(500).json({ message: 'Серверная ошибка' })
  }
}

export const getFullInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if(!user)
      return res.status(403).json({ message: 'Недостаточно доступа для выполнения операции' })

    const { municipality } = req.params
    const answers = await Answer.find({ municipality })

    const groupedByDate = Object.values(answers.reduce((acc, el) => {
      const date = el.date
      acc[date] = [...(acc[date] || []), el]
      return acc
    }, {}))

    const latest = groupedByDate[groupedByDate.length - 1]

    return res.json(latest)
  } catch (e) {
    console.log(e)
    return res.status(500).json({ message: 'Серверная ошибка' })
  }
}

export const getRating = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if(!user)
      return res.status(403).json({ message: 'Недостаточно доступа для выполнения операции' })

    const { municipality, date } = req.query

    const filters = {
      municipality,
      date
    }

    if(filters.date)
      filters.date = { $gt: new Date(date), $lt: new Date((+date + 1).toString()) }

    const query = Object.keys(filters).reduce((obj, key) => filters[key] ? { ...obj, [key]: filters[key] } : obj, {})

    const answers = await Answer.find(query)
    const questions = await Question.find()

    const groupedByYear = Object.values(answers.reduce((acc, el) => {
      const year = new Date(el.date).getFullYear()
      acc[year] = [...(acc[year] || []), el]
      return acc
    }, {}))

    const groupedByQuestion = groupedByYear.map(group => groupArrayByField(group, 'question'))

    const counted = groupedByQuestion.map(yearGroup => {
      return yearGroup.map(questionGroup => {
        return questionGroup
          .map(answer => {
            const question = questions.find(question => question._id.toString() === answer.question.toString())
            const { _id, municipality, date } = answer
            const { type, number, indicator } = question

            const obj = {
              _id,
              municipality,
              date,
              question: {
                _id: question._id,
                number,
                indicator
              }
            }

            return countAnswerResult(answer, type, obj)
          })
          .sort((a, b) => parseFloat(a.result) < parseFloat(b.result) ? 1 : -1)
          .map((answer, index) => {
            const between = (value, min, max) => value >= min && value <= max

            const number = index + 1

            if(between(number, 1, 5))
              return {
                ...answer,
                result: 10
              }

            if(between(number, 6, 15))
              return {
                ...answer,
                result: 7
              }

            if(between(number, 16, 25))
              return {
                ...answer,
                result: 4
              }

            if(between(number, 26, 35))
              return {
                ...answer,
                result: 2
              }

            if(number >= 36)
              return {
                ...answers,
                result: 1
              }
          })
      })
    })

    const flated = counted.map(yearGroup => groupArrayByField(yearGroup.flat(), 'municipality'))

    const grouped = flated.map(yearGroup => yearGroup.map(group => {
      const { municipality, date } = group[0]
      return {
        municipality,
        date,
        result: group.reduce((sum, next) => sum += next.result, 0),
        answers: group
      }
    }))

    return res.json(grouped)
  } catch (e) {
    console.log(e)
    return res.status(500).json({ message: 'Серверная ошибка' })
  }
}

export const getYears = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if(!user)
      return res.status(403).json({ message: 'Недостаточно доступа для выполнения операции' })

    const answers = await Answer.find()

    const years = [...new Set(answers.map(answer => getYear(answer.date)))]
    const sorted = years.sort((a, b) => b - a)

    return res.json(sorted)
  } catch (e) {
    console.log(e)
    return res.status(500).json({ message: 'Серверная ошибка' })
  }
}