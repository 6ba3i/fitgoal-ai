const Progress = require('../models/Progress');
const User = require('../models/User');
const LinearRegressionService = require('../services/ai/linearRegression');

class ProgressController {
  async getProgress(req, res) {
    try {
      const { limit = 30, startDate, endDate } = req.query;
      const userId = req.user.id;

      let progressData;
      
      if (startDate && endDate) {
        progressData = await Progress.getProgressByDateRange(
          userId,
          new Date(startDate),
          new Date(endDate)
        );
      } else {
        progressData = await Progress.getUserProgress(userId, parseInt(limit));
      }

      res.json({
        success: true,
        data: progressData
      });
    } catch (error) {
      console.error('Get progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get progress data',
        error: error.message
      });
    }
  }

  async addProgress(req, res) {
    try {
      const userId = req.user.id;
      const progressData = req.body;

      // Check if entry already exists for today
      const today = new Date().setHours(0, 0, 0, 0);
      const existingEntry = await Progress.findOne({
        userId,
        date: {
          $gte: new Date(today),
          $lt: new Date(today + 24 * 60 * 60 * 1000)
        }
      });

      if (existingEntry) {
        return res.status(400).json({
          success: false,
          message: 'Progress entry already exists for today. Please update the existing entry.'
        });
      }

      // Create new progress entry
      const progress = new Progress({
        userId,
        ...progressData
      });

      await progress.save();

      // Update user's current weight
      const user = await User.findById(userId);
      user.profile.weight = progressData.weight;
      await user.save();

      // Calculate weight change
      const weightChange = await progress.calculateWeightChange();

      res.status(201).json({
        success: true,
        message: 'Progress entry added successfully',
        data: {
          progress,
          weightChange
        }
      });
    } catch (error) {
      console.error('Add progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add progress entry',
        error: error.message
      });
    }
  }

  async getLatestProgress(req, res) {
    try {
      const userId = req.user.id;
      
      const latestProgress = await Progress.findOne({ userId })
        .sort({ date: -1 });

      if (!latestProgress) {
        return res.status(404).json({
          success: false,
          message: 'No progress entries found'
        });
      }

      res.json({
        success: true,
        data: latestProgress
      });
    } catch (error) {
      console.error('Get latest progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get latest progress',
        error: error.message
      });
    }
  }

  async getProgressById(req, res) {
    try {
      const { progressId } = req.params;
      const userId = req.user.id;

      const progress = await Progress.findOne({
        _id: progressId,
        userId
      });

      if (!progress) {
        return res.status(404).json({
          success: false,
          message: 'Progress entry not found'
        });
      }

      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      console.error('Get progress by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get progress entry',
        error: error.message
      });
    }
  }

  async updateProgress(req, res) {
    try {
      const { progressId } = req.params;
      const userId = req.user.id;
      const updates = req.body;

      const progress = await Progress.findOneAndUpdate(
        { _id: progressId, userId },
        updates,
        { new: true, runValidators: true }
      );

      if (!progress) {
        return res.status(404).json({
          success: false,
          message: 'Progress entry not found'
        });
      }

      // Update user's current weight if it's the latest entry
      const latestProgress = await Progress.findOne({ userId })
        .sort({ date: -1 });
      
      if (latestProgress._id.toString() === progressId) {
        const user = await User.findById(userId);
        user.profile.weight = updates.weight || progress.weight;
        await user.save();
      }

      res.json({
        success: true,
        message: 'Progress entry updated successfully',
        data: progress
      });
    } catch (error) {
      console.error('Update progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update progress entry',
        error: error.message
      });
    }
  }

  async deleteProgress(req, res) {
    try {
      const { progressId } = req.params;
      const userId = req.user.id;

      const progress = await Progress.findOneAndDelete({
        _id: progressId,
        userId
      });

      if (!progress) {
        return res.status(404).json({
          success: false,
          message: 'Progress entry not found'
        });
      }

      res.json({
        success: true,
        message: 'Progress entry deleted successfully'
      });
    } catch (error) {
      console.error('Delete progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete progress entry',
        error: error.message
      });
    }
  }

  async getProgressSummary(req, res) {
    try {
      const userId = req.user.id;
      const progressData = await Progress.getUserProgress(userId, 90);

      if (progressData.length === 0) {
        return res.json({
          success: true,
          data: {
            message: 'No progress data available yet'
          }
        });
      }

      const summary = {
        totalEntries: progressData.length,
        startWeight: progressData[progressData.length - 1].weight,
        currentWeight: progressData[0].weight,
        totalWeightChange: progressData[0].weight - progressData[progressData.length - 1].weight,
        averageWeight: progressData.reduce((sum, p) => sum + p.weight, 0) / progressData.length,
        lowestWeight: Math.min(...progressData.map(p => p.weight)),
        highestWeight: Math.max(...progressData.map(p => p.weight)),
        averageBodyFat: progressData
          .filter(p => p.bodyFat)
          .reduce((sum, p, _, arr) => sum + p.bodyFat / arr.length, 0),
        averageMood: this.calculateAverageMood(progressData),
        averageEnergyLevel: progressData
          .filter(p => p.energyLevel)
          .reduce((sum, p, _, arr) => sum + p.energyLevel / arr.length, 0),
        workoutCompletionRate: (progressData.filter(p => p.workoutCompleted).length / progressData.length) * 100,
        averageDailySteps: progressData
          .filter(p => p.dailySteps)
          .reduce((sum, p, _, arr) => sum + p.dailySteps / arr.length, 0),
        averageWaterIntake: progressData
          .filter(p => p.waterIntake)
          .reduce((sum, p, _, arr) => sum + p.waterIntake / arr.length, 0),
        averageSleepHours: progressData
          .filter(p => p.sleepHours)
          .reduce((sum, p, _, arr) => sum + p.sleepHours / arr.length, 0)
      };

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Get progress summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get progress summary',
        error: error.message
      });
    }
  }

  calculateAverageMood(progressData) {
    const moodValues = {
      excellent: 5,
      good: 4,
      neutral: 3,
      tired: 2,
      exhausted: 1
    };

    const moodData = progressData.filter(p => p.mood);
    if (moodData.length === 0) return 'N/A';

    const averageValue = moodData.reduce((sum, p) => sum + moodValues[p.mood], 0) / moodData.length;
    
    if (averageValue >= 4.5) return 'excellent';
    if (averageValue >= 3.5) return 'good';
    if (averageValue >= 2.5) return 'neutral';
    if (averageValue >= 1.5) return 'tired';
    return 'exhausted';
  }

  async getProgressTrends(req, res) {
    try {
      const userId = req.user.id;
      const progressData = await Progress.getUserProgress(userId, 30);

      if (progressData.length < 2) {
        return res.json({
          success: true,
          data: {
            message: 'Not enough data to calculate trends'
          }
        });
      }

      const trends = LinearRegressionService.calculateTrend(progressData);
      const predictions = LinearRegressionService.predictWeight(
        progressData[0].weight,
        0, // Not using target weight here
        30,
        progressData
      );

      res.json({
        success: true,
        data: {
          trends,
          predictions: predictions.predictions
        }
      });
    } catch (error) {
      console.error('Get progress trends error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get progress trends',
        error: error.message
      });
    }
  }

  async importProgress(req, res) {
    try {
      const userId = req.user.id;
      const { data } = req.body;

      const importedEntries = [];
      const errors = [];

      for (const entry of data) {
        try {
          const progress = new Progress({
            userId,
            ...entry,
            date: new Date(entry.date)
          });
          await progress.save();
          importedEntries.push(progress);
        } catch (error) {
          errors.push({
            entry,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        message: `Imported ${importedEntries.length} entries successfully`,
        data: {
          imported: importedEntries.length,
          failed: errors.length,
          errors: errors.length > 0 ? errors : undefined
        }
      });
    } catch (error) {
      console.error('Import progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to import progress data',
        error: error.message
      });
    }
  }

  async exportProgressCSV(req, res) {
    try {
      const userId = req.user.id;
      const progressData = await Progress.find({ userId }).sort({ date: -1 });

      // Create CSV content
      const headers = ['Date', 'Weight', 'Body Fat %', 'Muscle Mass', 'Mood', 'Energy Level', 'Workout', 'Steps', 'Water (ml)', 'Sleep (hours)', 'Notes'];
      const rows = progressData.map(p => [
        p.date.toISOString().split('T')[0],
        p.weight,
        p.bodyFat || '',
        p.muscleMass || '',
        p.mood || '',
        p.energyLevel || '',
        p.workoutCompleted ? 'Yes' : 'No',
        p.dailySteps || '',
        p.waterIntake || '',
        p.sleepHours || '',
        p.notes || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=progress_export.csv');
      res.send(csvContent);
    } catch (error) {
      console.error('Export progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export progress data',
        error: error.message
      });
    }
  }

  async uploadProgressPhotos(req, res) {
    try {
      const { progressId } = req.params;
      const { photos } = req.body;
      const userId = req.user.id;

      const progress = await Progress.findOne({
        _id: progressId,
        userId
      });

      if (!progress) {
        return res.status(404).json({
          success: false,
          message: 'Progress entry not found'
        });
      }

      progress.photos = photos;
      await progress.save();

      res.json({
        success: true,
        message: 'Photos uploaded successfully',
        data: progress
      });
    } catch (error) {
      console.error('Upload photos error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload photos',
        error: error.message
      });
    }
  }
}

module.exports = new ProgressController();