import mongoose from 'mongoose';
const InvestigationSchema = new mongoose.Schema({
  mysteryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mystery', required: true }, ownerSessionHash: { type: String, required: true },
  reviewedEvidenceIds: { type: [String], default: [] }, notes: { type: String, default: '' },
  boardLinks: { type: [{ evidenceId: String, suspectId: String }], default: [] },
  interrogations: { type: [{ suspectId: String, question: String, answer: String, createdAt: { type: Date, default: Date.now } }], default: [] },
  score: { type: Number, default: 0 }, rank: { type: String, default: 'Rookie' },
  accusation: { suspectId: String, correct: Boolean, submittedAt: Date }
}, { timestamps: true });
InvestigationSchema.index({ mysteryId: 1, ownerSessionHash: 1 }, { unique: true });
export const Investigation = mongoose.model('Investigation', InvestigationSchema);
