const firebaseService = require('../services/firebase.service');
const LinearRegressionService = require('../services/ai/linearRegression');

class ProgressController {
  async getProgress(req, res) {
    try {
      const { limit = 30, startDate, endDate } = req.query;
      const userId = req.user.id;

      let progressData;
      
      if (startDate && endDate) {
        // Get progress data within date range
        const allProgress = await firebaseService.queryFirestore(
          'progress', 
          'userId', 
          '==', 
          userId,
          200 // Get more data to filter by date
        );

        // Filter by date range
        progressData = allProgress.filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate >= new Date(startDate) && entryDate <= new Date(endDate);
        });

        // Sort by date (most recent first)
        progressData.sort((a, b) => new Date(b.date) - new Date(a.date));
      } else {
        // Get recent progress data
        progressData = await firebaseService.queryFirestore(
          'progress', 
          'userId', 
          '==', 
          userId,
          parseInt(limit)
        );

        // Sort by date (most recent first) 
        progressData.sort((a, b) => new Date(b.date) - new Date(a.date));
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get all progress entries for the user
      const allProgress = await firebaseService.queryFirestore(
        'progress', 
        'userId', 
        '==', 
        userId,
        50
      );

      // Check if there's already an entry for today
      const existingEntry = allProgress.find(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= today && entryDate < tomorrow;
      });

      if (existingEntry) {
        return res.status(400).json({
          success: false,
          message: 'Progress entry already exists for today. Please update the existing entry.'
        });
      }

      // Create new progress entry
      const newProgress = {
        userId,
        date: new Date(),
        weight: progressData.weight,
        bodyFat: progressData.bodyFat || null,
        muscleMass: progressData.muscleMass || null,
        measurements: progressData.measurements || {},
        photos: progressData.photos || [],
        notes: progressData.notes || '',
        mood: progressData.mood || null,
        energyLevel: progressData.energyLevel || null,
        workoutCompleted: progressData.workoutCompleted || false,
        dailySteps: progressData.dailySteps || null,
        waterIntake: progressData.waterIntake || null,
        sleepHours: progressData.sleepHours || null,
        createdAt: new Date()
      };

      // Store in Firestore
      const progressId = `${userId}_${Date.now()}`;
      await firebaseService.storeInFirestore('progress', progressId, newProgress);

      // Update user's current weight in profile
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      if (userProfile) {
        await firebaseService.storeInFirestore('users', userId, {
          ...userProfile,
          profile: {
            ...userProfile.profile,
            weight: progressData.weight
          },
          updatedAt: new Date()
        });
      }

      res.status(201).json({
        success: true,
        message: 'Progress entry added successfully',
        data: { id: progressId, ...newProgress }
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

      // Get the most recent progress entry
      const progressData = await firebaseService.queryFirestore(
        'progress', 
        'userId', 
        '==', 
        userId,
        1
      );

      if (progressData.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No progress entries found'
        });
      }

      // Sort by date and get the most recent
      const latest = progressData.sort((a, b) => new Date(b.date) - new Date(a.date))[0];

      res.json({
        success: true,
        data: latest
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

      // Get progress entry by ID
      const progress = await firebaseService.getFromFirestore('progress', progressId);

      if (!progress) {
        return res.status(404).json({
          success: false,
          message: 'Progress entry not found'
        });
      }

      // Check if user owns this progress entry
      if (progress.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
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

      // Get existing progress entry
      const existingProgress = await firebaseService.getFromFirestore('progress', progressId);

      if (!existingProgress) {
        return res.status(404).json({
          success: false,
          message: 'Progress entry not found'
        });
      }

      // Check if user owns this progress entry
      if (existingProgress.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Update progress entry
      const updatedProgress = {
        ...existingProgress,
        ...updates,
        updatedAt: new Date()
      };

      await firebaseService.storeInFirestore('progress', progressId, updatedProgress);

      // Update user's current weight if this is the latest entry and weight was updated
      if (updates.weight) {
        const allProgress = await firebaseService.queryFirestore(
          'progress', 
          'userId', 
          '==', 
          userId,
          10
        );

        const sortedProgress = allProgress.sort((a, b) => new Date(b.date) - new Date(a.date));
        const isLatest = sortedProgress[0]?.id === progressId;

        if (isLatest) {
          const userProfile = await firebaseService.getFromFirestore('users', userId);
          if (userProfile) {
            await firebaseService.storeInFirestore('users', userId, {
              ...userProfile,
              profile: {
                ...userProfile.profile,
                weight: updates.weight
              },
              updatedAt: new Date()
            });
          }
        }
      }

      res.json({
        success: true,
        message: 'Progress entry updated successfully',
        data: updatedProgress
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

      // Get progress entry to verify ownership
      const progress = await firebaseService.getFromFirestore('progress', progressId);

      if (!progress) {
        return res.status(404).json({
          success: false,
          message: 'Progress entry not found'
        });
      }

      // Check if user owns this progress entry
      if (progress.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Delete progress entry
      await firebaseService.deleteFromFirestore('progress', progressId);

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

      // Get recent progress data (last 90 days)
      const progressData = await firebaseService.queryFirestore(
        'progress', 
        'userId', 
        '==', 
        userId,
        90
      );

      if (progressData.length === 0) {
        return res.json({
          success: true,
          data: {
            message: 'No progress data available',
            totalEntries: 0
          }
        });
      }

      // Sort by date (most recent first)
      const sortedData = progressData.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Calculate summary statistics
      const summary = {
        totalEntries: sortedData.length,
        latestWeight: sortedData[0].weight,
        earliestWeight: sortedData[sortedData.length - 1].weight,
        weightChange: sortedData[0].weight - sortedData[sortedData.length - 1].weight,
        averageWeight: sortedData.reduce((sum, entry) => sum + entry.weight, 0) / sortedData.length,
        workoutsCompleted: sortedData.filter(entry => entry.workoutCompleted).length,
        workoutConsistency: (sortedData.filter(entry => entry.workoutCompleted).length / sortedData.length) * 100,
        averageMood: this.calculateAverageMood(sortedData),
        averageEnergyLevel: this.calculateAverageEnergyLevel(sortedData),
        totalSteps: sortedData.reduce((sum, entry) => sum + (entry.dailySteps || 0), 0),
        averageSleep: this.calculateAverageSleep(sortedData),
        timespan: {
          startDate: sortedData[sortedData.length - 1].date,
          endDate: sortedData[0].date,
          days: Math.ceil((new Date(sortedData[0].date) - new Date(sortedData[sortedData.length - 1].date)) / (1000 * 60 * 60 * 24))
        }
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

  async getProgressTrends(req, res) {
    try {
      const userId = req.user.id;

      // Get progress data for trend analysis
      const progressData = await firebaseService.queryFirestore(
        'progress', 
        'userId', 
        '==', 
        userId,
        60
      );

      if (progressData.length < 3) {
        return res.json({
          success: true,
          data: {
            message: 'Need at least 3 entries for trend analysis'
          }
        });
      }

      // Sort by date (most recent first)
      const sortedData = progressData.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Calculate trends using linear regression
      const weightTrend = LinearRegressionService.calculateTrend(sortedData);
      const predictions = LinearRegressionService.predictWeight(sortedData, 30);

      const trends = {
        weightTrend,
        predictions: predictions.predictions.slice(0, 14), // Next 2 weeks
        weeklyChanges: this.calculateWeeklyChanges(sortedData),
        monthlyChanges: this.calculateMonthlyChanges(sortedData),
        progressTowardsGoal: await this.calculateGoalProgress(userId, sortedData),
        consistency: {
          logging: this.calculateLoggingConsistency(sortedData),
          workouts: this.calculateWorkoutConsistency(sortedData)
        }
      };

      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      console.error('Get progress trends error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate progress trends',
        error: error.message
      });
    }
  }

  async importProgress(req, res) {
    try {
      const userId = req.user.id;
      const { data } = req.body;

      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid data format'
        });
      }

      const importedEntries = [];
      const errors = [];

      for (let i = 0; i < data.length; i++) {
        try {
          const entry = data[i];
          
          // Validate required fields
          if (!entry.weight || !entry.date) {
            errors.push(`Entry ${i + 1}: Missing required fields (weight, date)`);
            continue;
          }

          const progressEntry = {
            userId,
            date: new Date(entry.date),
            weight: parseFloat(entry.weight),
            bodyFat: entry.bodyFat ? parseFloat(entry.bodyFat) : null,
            muscleMass: entry.muscleMass ? parseFloat(entry.muscleMass) : null,
            measurements: entry.measurements || {},
            notes: entry.notes || '',
            mood: entry.mood || null,
            energyLevel: entry.energyLevel ? parseInt(entry.energyLevel) : null,
            workoutCompleted: Boolean(entry.workoutCompleted),
            dailySteps: entry.dailySteps ? parseInt(entry.dailySteps) : null,
            waterIntake: entry.waterIntake ? parseInt(entry.waterIntake) : null,
            sleepHours: entry.sleepHours ? parseFloat(entry.sleepHours) : null,
            createdAt: new Date(),
            imported: true
          };

          // Store in Firestore
          const progressId = `${userId}_import_${Date.now()}_${i}`;
          await firebaseService.storeInFirestore('progress', progressId, progressEntry);
          
          importedEntries.push({ id: progressId, ...progressEntry });
        } catch (entryError) {
          errors.push(`Entry ${i + 1}: ${entryError.message}`);
        }
      }

      res.json({
        success: true,
        message: `Imported ${importedEntries.length} entries`,
        data: {
          imported: importedEntries.length,
          errors: errors.length,
          errorDetails: errors
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

      // Get all progress data
      const progressData = await firebaseService.queryFirestore(
        'progress', 
        'userId', 
        '==', 
        userId,
        500
      );

      if (progressData.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No progress data to export'
        });
      }

      // Sort by date (oldest first for chronological export)
      const sortedData = progressData.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Generate CSV headers
      const headers = [
        'Date', 'Weight', 'Body Fat', 'Muscle Mass', 'Mood', 'Energy Level',
        'Workout Completed', 'Daily Steps', 'Water Intake', 'Sleep Hours',
        'Chest', 'Waist', 'Hips', 'Arms', 'Thighs', 'Notes'
      ];

      // Generate CSV rows
      const rows = sortedData.map(entry => [
        new Date(entry.date).toISOString().split('T')[0], // Date only
        entry.weight || '',
        entry.bodyFat || '',
        entry.muscleMass || '',
        entry.mood || '',
        entry.energyLevel || '',
        entry.workoutCompleted ? 'Yes' : 'No',
        entry.dailySteps || '',
        entry.waterIntake || '',
        entry.sleepHours || '',
        entry.measurements?.chest || '',
        entry.measurements?.waist || '',
        entry.measurements?.hips || '',
        entry.measurements?.arms || '',
        entry.measurements?.thighs || '',
        entry.notes || ''
      ]);

      // Create CSV content
      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="progress-export.csv"');
      res.send(csvContent);
    } catch (error) {
      console.error('Export CSV error:', error);
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
      const userId = req.user.id;
      const { photos } = req.body;

      // Get existing progress entry
      const existingProgress = await firebaseService.getFromFirestore('progress', progressId);

      if (!existingProgress) {
        return res.status(404).json({
          success: false,
          message: 'Progress entry not found'
        });
      }

      // Check if user owns this progress entry
      if (existingProgress.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Update progress entry with photos
      const updatedProgress = {
        ...existingProgress,
        photos: photos || [],
        updatedAt: new Date()
      };

      await firebaseService.storeInFirestore('progress', progressId, updatedProgress);

      res.json({
        success: true,
        message: 'Progress photos updated successfully',
        data: updatedProgress
      });
    } catch (error) {
      console.error('Upload progress photos error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload progress photos',
        error: error.message
      });
    }
  }

  // Helper methods
  calculateAverageMood(progressData) {
    const moodValues = { excellent: 5, good: 4, neutral: 3, tired: 2, exhausted: 1 };
    const moodEntries = progressData.filter(entry => entry.mood);
    
    if (moodEntries.length === 0) return 'neutral';
    
    const average = moodEntries.reduce((sum, entry) => sum + moodValues[entry.mood], 0) / moodEntries.length;
    
    if (average >= 4.5) return 'excellent';
    if (average >= 3.5) return 'good';
    if (average >= 2.5) return 'neutral';
    if (average >= 1.5) return 'tired';
    return 'exhausted';
  }

  calculateAverageEnergyLevel(progressData) {
    const energyEntries = progressData.filter(entry => entry.energyLevel);
    if (energyEntries.length === 0) return null;
    
    return energyEntries.reduce((sum, entry) => sum + entry.energyLevel, 0) / energyEntries.length;
  }

  calculateAverageSleep(progressData) {
    const sleepEntries = progressData.filter(entry => entry.sleepHours);
    if (sleepEntries.length === 0) return null;
    
    return sleepEntries.reduce((sum, entry) => sum + entry.sleepHours, 0) / sleepEntries.length;
  }

  calculateWeeklyChanges(progressData) {
    const weeks = [];
    let currentWeek = [];
    
    progressData.forEach(entry => {
      currentWeek.push(entry);
      if (currentWeek.length === 7) {
        const avgWeight = currentWeek.reduce((sum, e) => sum + e.weight, 0) / currentWeek.length;
        weeks.push({ week: weeks.length + 1, averageWeight: avgWeight });
        currentWeek = [];
      }
    });
    
    return weeks;
  }

  calculateMonthlyChanges(progressData) {
    const months = {};
    
    progressData.forEach(entry => {
      const monthKey = new Date(entry.date).toISOString().substring(0, 7); // YYYY-MM
      if (!months[monthKey]) {
        months[monthKey] = [];
      }
      months[monthKey].push(entry);
    });
    
    return Object.keys(months).map(month => ({
      month,
      averageWeight: months[month].reduce((sum, e) => sum + e.weight, 0) / months[month].length,
      entries: months[month].length
    }));
  }

  async calculateGoalProgress(userId, progressData) {
    try {
      // Get user profile to access goals
      const userProfile = await firebaseService.getFromFirestore('users', userId);
      
      if (!userProfile?.profile) return null;
      
      const { weight: currentWeight, targetWeight, goal } = userProfile.profile;
      const startWeight = progressData[progressData.length - 1]?.weight || currentWeight;
      
      let progress = 0;
      if (goal === 'lose') {
        progress = ((startWeight - currentWeight) / (startWeight - targetWeight)) * 100;
      } else if (goal === 'gain') {
        progress = ((currentWeight - startWeight) / (targetWeight - startWeight)) * 100;
      } else {
        progress = Math.abs(currentWeight - targetWeight) <= 1 ? 100 : 0;
      }
      
      return {
        currentWeight,
        targetWeight,
        startWeight,
        progress: Math.max(0, Math.min(100, progress)),
        goal
      };
    } catch (error) {
      console.error('Error calculating goal progress:', error);
      return null;
    }
  }

  calculateLoggingConsistency(progressData) {
    // Calculate based on how many days have entries in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentEntries = progressData.filter(entry => new Date(entry.date) >= thirtyDaysAgo);
    const uniqueDays = new Set(recentEntries.map(entry => new Date(entry.date).toDateString())).size;
    
    return Math.round((uniqueDays / 30) * 100);
  }

  calculateWorkoutConsistency(progressData) {
    const workoutEntries = progressData.filter(entry => entry.workoutCompleted);
    return Math.round((workoutEntries.length / progressData.length) * 100);
  }
}

module.exports = new ProgressController();