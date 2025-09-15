class PredictionsService {
  /**
   * Predict optimal meal times based on user's schedule and goals
   */
  predictMealTimes(profile, activitySchedule) {
    const mealTimes = {
      breakfast: '07:00',
      snack1: '10:00',
      lunch: '12:30',
      snack2: '15:30',
      dinner: '18:30',
      snack3: '20:30'
    };

    // Adjust based on activity schedule
    if (activitySchedule.morningWorkout) {
      mealTimes.breakfast = '06:00';
      mealTimes.snack1 = '09:00';
    }

    if (activitySchedule.eveningWorkout) {
      mealTimes.dinner = '19:30';
      mealTimes.snack3 = '21:00';
    }

    // Adjust based on goal
    if (profile.goal === 'lose') {
      // Remove late night snack for weight loss
      delete mealTimes.snack3;
    } else if (profile.goal === 'gain') {
      // Add extra meal for muscle gain
      mealTimes.snack4 = '22:00';
    }

    return mealTimes;
  }

  /**
   * Predict workout performance based on recent data
   */
  predictWorkoutPerformance(progressData, sleepData, nutritionData) {
    let performanceScore = 50; // Base score

    // Factor in recent progress
    if (progressData.length > 0) {
      const recentEnergy = progressData
        .slice(0, 7)
        .reduce((sum, p) => sum + (p.energyLevel || 5), 0) / 7;
      performanceScore += (recentEnergy - 5) * 5;
    }

    // Factor in sleep
    if (sleepData && sleepData.averageHours) {
      if (sleepData.averageHours >= 7 && sleepData.averageHours <= 9) {
        performanceScore += 10;
      } else if (sleepData.averageHours < 6) {
        performanceScore -= 15;
      }
    }

    // Factor in nutrition
    if (nutritionData) {
      if (nutritionData.proteinMet) performanceScore += 5;
      if (nutritionData.hydrationMet) performanceScore += 5;
      if (nutritionData.caloriesMet) performanceScore += 10;
    }

    return {
      score: Math.max(0, Math.min(100, performanceScore)),
      recommendation: this.getPerformanceRecommendation(performanceScore)
    };
  }

  getPerformanceRecommendation(score) {
    if (score >= 80) {
      return 'Excellent conditions for a high-intensity workout!';
    } else if (score >= 60) {
      return 'Good energy levels - perfect for moderate intensity training.';
    } else if (score >= 40) {
      return 'Consider a lighter workout or active recovery today.';
    } else {
      return 'Rest might be more beneficial today. Listen to your body.';
    }
  }

  /**
   * Predict weight loss/gain rate based on deficit/surplus
   */
  predictWeightChangeRate(calorieDeficit, activityLevel, metabolicRate) {
    // 1 pound = 3500 calories approximately
    const poundsPerWeek = calorieDeficit * 7 / 3500;
    const kgPerWeek = poundsPerWeek * 0.453592;

    // Adjust for metabolic adaptation
    let adaptationFactor = 1.0;
    if (Math.abs(calorieDeficit) > 1000) {
      adaptationFactor = 0.8; // Body adapts to extreme deficits
    } else if (Math.abs(calorieDeficit) > 750) {
      adaptationFactor = 0.9;
    }

    // Adjust for activity level
    const activityMultiplier = {
      sedentary: 0.9,
      light: 0.95,
      moderate: 1.0,
      active: 1.05,
      veryActive: 1.1
    };

    const adjustedRate = kgPerWeek * adaptationFactor * (activityMultiplier[activityLevel] || 1.0);

    return {
      weeklyRate: adjustedRate,
      monthlyRate: adjustedRate * 4.33,
      realistic: Math.abs(adjustedRate) <= 1.0, // 1kg per week is considered safe
      recommendation: this.getRateRecommendation(adjustedRate)
    };
  }

  getRateRecommendation(rate) {
    if (Math.abs(rate) > 1.0) {
      return 'This rate might be too aggressive. Consider a more moderate approach.';
    } else if (Math.abs(rate) < 0.25) {
      return 'Progress might be slow at this rate. Consider adjusting your calorie deficit.';
    } else {
      return 'This is a healthy and sustainable rate of change.';
    }
  }

  /**
   * Predict macro split optimization based on user type
   */
  predictOptimalMacroSplit(profile, workoutType, progressHistory) {
    let proteinRatio = 0.30;
    let carbRatio = 0.40;
    let fatRatio = 0.30;

    // Adjust for goal
    if (profile.goal === 'gain') {
      proteinRatio = 0.35;
      carbRatio = 0.45;
      fatRatio = 0.20;
    } else if (profile.goal === 'lose') {
      proteinRatio = 0.40;
      carbRatio = 0.30;
      fatRatio = 0.30;
    }

    // Adjust for workout type
    if (workoutType === 'endurance') {
      carbRatio += 0.10;
      fatRatio -= 0.10;
    } else if (workoutType === 'strength') {
      proteinRatio += 0.05;
      carbRatio -= 0.05;
    }

    // Normalize to ensure sum equals 1
    const total = proteinRatio + carbRatio + fatRatio;
    proteinRatio /= total;
    carbRatio /= total;
    fatRatio /= total;

    return {
      protein: Math.round(proteinRatio * 100),
      carbs: Math.round(carbRatio * 100),
      fat: Math.round(fatRatio * 100),
      reasoning: this.getMacroReasoning(profile, workoutType)
    };
  }

  getMacroReasoning(profile, workoutType) {
    const reasons = [];
    
    if (profile.goal === 'gain') {
      reasons.push('Higher protein for muscle synthesis');
      reasons.push('Increased carbs for energy and recovery');
    } else if (profile.goal === 'lose') {
      reasons.push('Higher protein to preserve muscle mass');
      reasons.push('Moderate carbs to maintain energy');
    }

    if (workoutType === 'endurance') {
      reasons.push('Extra carbohydrates for sustained energy');
    } else if (workoutType === 'strength') {
      reasons.push('Additional protein for muscle repair');
    }

    return reasons;
  }

  /**
   * Predict supplement recommendations
   */
  predictSupplementNeeds(profile, diet, deficiencies) {
    const supplements = [];

    // Basic recommendations
    if (profile.goal === 'gain') {
      supplements.push({
        name: 'Creatine Monohydrate',
        dosage: '5g daily',
        timing: 'Post-workout or anytime',
        reason: 'Supports muscle growth and strength'
      });
    }

    if (profile.activityLevel === 'active' || profile.activityLevel === 'veryActive') {
      supplements.push({
        name: 'Whey Protein',
        dosage: '25-30g per serving',
        timing: 'Post-workout',
        reason: 'Quick absorption for muscle recovery'
      });
    }

    // Diet-based recommendations
    if (diet === 'vegan' || diet === 'vegetarian') {
      supplements.push({
        name: 'Vitamin B12',
        dosage: '2.4mcg daily',
        timing: 'With meals',
        reason: 'Often lacking in plant-based diets'
      });
      
      supplements.push({
        name: 'Iron',
        dosage: '18mg daily',
        timing: 'With vitamin C, avoid with calcium',
        reason: 'Plant-based iron is less bioavailable'
      });
    }

    // General health
    supplements.push({
      name: 'Vitamin D3',
      dosage: '1000-2000 IU daily',
      timing: 'With fat-containing meal',
      reason: 'Supports bone health and immunity'
    });

    supplements.push({
      name: 'Omega-3',
      dosage: '1-2g daily',
      timing: 'With meals',
      reason: 'Anti-inflammatory and heart health'
    });

    return supplements;
  }

  /**
   * Predict recovery time needed
   */
  predictRecoveryTime(workoutIntensity, muscleSoreness, sleepQuality, nutrition) {
    let recoveryHours = 24; // Base recovery time

    // Adjust for intensity
    const intensityMultiplier = {
      low: 0.5,
      moderate: 1.0,
      high: 1.5,
      extreme: 2.0
    };
    recoveryHours *= intensityMultiplier[workoutIntensity] || 1.0;

    // Adjust for soreness
    if (muscleSoreness > 7) {
      recoveryHours += 24;
    } else if (muscleSoreness > 5) {
      recoveryHours += 12;
    }

    // Adjust for sleep quality
    if (sleepQuality < 5) {
      recoveryHours += 12;
    } else if (sleepQuality >= 8) {
      recoveryHours -= 6;
    }

    // Adjust for nutrition
    if (nutrition.proteinMet && nutrition.hydrationMet) {
      recoveryHours -= 6;
    }

    return {
      hours: Math.max(12, Math.min(72, recoveryHours)),
      recommendation: this.getRecoveryRecommendation(recoveryHours)
    };
  }

  getRecoveryRecommendation(hours) {
    if (hours <= 24) {
      return 'You should be ready for another workout tomorrow!';
    } else if (hours <= 48) {
      return 'Consider light activity tomorrow, full intensity in 2 days.';
    } else {
      return 'Take 2-3 days for recovery. Focus on stretching and light movement.';
    }
  }

  /**
   * Predict adherence probability
   */
  predictAdherence(pastAdherence, goalDifficulty, supportSystem, motivation) {
    let adherenceProbability = 50; // Base probability

    // Historical adherence is the strongest predictor
    if (pastAdherence) {
      adherenceProbability = pastAdherence * 0.7 + adherenceProbability * 0.3;
    }

    // Adjust for goal difficulty
    const difficultyAdjustment = {
      easy: 20,
      moderate: 10,
      hard: -10,
      extreme: -25
    };
    adherenceProbability += difficultyAdjustment[goalDifficulty] || 0;

    // Support system impact
    if (supportSystem) {
      adherenceProbability += 15;
    }

    // Motivation level
    adherenceProbability += (motivation - 5) * 3;

    return {
      probability: Math.max(0, Math.min(100, adherenceProbability)),
      tips: this.getAdherenceTips(adherenceProbability)
    };
  }

  getAdherenceTips(probability) {
    const tips = [];
    
    if (probability < 50) {
      tips.push('Consider setting smaller, more achievable milestones');
      tips.push('Find an accountability partner or join a support group');
      tips.push('Track your progress daily to stay motivated');
    } else if (probability < 75) {
      tips.push('You\'re on the right track! Stay consistent');
      tips.push('Reward yourself for reaching milestones');
      tips.push('Plan for potential obstacles in advance');
    } else {
      tips.push('Excellent adherence potential!');
      tips.push('Consider setting more challenging goals');
      tips.push('Share your success to inspire others');
    }

    return tips;
  }
}

module.exports = new PredictionsService();