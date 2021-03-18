import mongoose from 'mongoose'

const { Schema, model } = mongoose

const userSchema = new Schema({
  login: { type: String, required: true, unique: true },
  password: { type: String, required: true }
})

export default model('User', userSchema)