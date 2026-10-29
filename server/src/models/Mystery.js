import mongoose from 'mongoose';

const suspect = new mongoose.Schema({ id: String, name: String, age: Number, role: String, bio: String, motive: String, alibi: String, relationships: [String], statement: String, suspiciousDetails: [String] }, { _id: false });
const evidence = new mongoose.Schema({ id: String, title: String, category: String, description: String, content: String, timestamp: String, source: String, relatedSuspectIds: [String], relevance: String, observations: [String] }, { _id: false });
const event = new mongoose.Schema({ timestamp: String, description: String, evidenceId: String, suspectIds: [String], certainty: { type: String, enum: ['confirmed', 'disputed'] } }, { _id: false });
const MysterySchema = new mongoose.Schema({
  ownerSessionHash: { type: String, required: true, index: true }, status: { type: String, enum: ['ready'], default: 'ready' },
  title: { type: String, required: true }, summary: { type: String, required: true }, incidentDate: String, location: String, objective: String,
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] }, mysteryType: String, estimatedMinutes: Number,
  suspects: [suspect], evidence: [evidence], timeline: [event],
  solution: { culpritId: String, motive: String, explanation: String, reasoning: [String], supportingEvidenceIds: [String], redHerrings: [String] }
}, { timestamps: true });
MysterySchema.index({ ownerSessionHash: 1, createdAt: -1 });
export const Mystery = mongoose.model('Mystery', MysterySchema);
