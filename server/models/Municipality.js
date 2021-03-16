import mongoose from 'mongoose'

const { Schema, model } = mongoose

const municipalitySchema = new Schema({
  name: { type: String, required: true, unique: true }
})

export default model('Municipality', municipalitySchema)