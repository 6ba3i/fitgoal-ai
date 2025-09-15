const MLRegression = require('ml-regression');

class LinearRegressionService {
  predictWeight(progressData, daysAhead = 30) {
    if (!progressData || progressData.length < 2) {
      throw new Error('Insufficient data for prediction');
    }

    // Prepare data for regression
    const x = progressData.map((_, index) => [index]);
    const y = progressData.map(data => data.weight);

    // Create and train the model
    const regression = new MLRegression.PolynomialRegression(x, y, 2);

    // Generate predictions
    const predictions = [];
    const lastIndex = progressData.length - 1;
    
    for (let i = 1; i <= daysAhead; i++) {
      const predictedWeight = regression.predict(lastIndex + i);
      predictions.push({
        day: i,
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        weight: Math.round(predictedWeight * 10) / 10
      });
    }

    return {
      predictions,
      equation: regression.toString(),
      r2: regression.score(x, y),
      trend: this.calculateTrend(progressData)
    };
  }

  calculateTrend(data) {
    if (data.length < 2) return 'insufficient_data';
    
    const firstWeight = data[0].weight;
    const lastWeight = data[data.length - 1].weight;
    const change = lastWeight - firstWeight;
    const changePerWeek = (change / data.length) * 7;

    return {
      totalChange: change,
      weeklyChange: changePerWeek,
      direction: change < 0 ? 'losing' : change > 0 ? 'gaining' : 'maintaining',
      pace: Math.abs(changePerWeek) > 1 ? 'fast' : 'moderate'
    };
  }

  calculateCalorieDeficit(currentWeight, targetWeight, targetDate) {
    const daysToTarget = Math.ceil((new Date(targetDate) - new Date()) / (1000 * 60 * 60 * 24));
    const weightToLose = currentWeight - targetWeight;
    const weeklyLoss = (weightToLose / daysToTarget) * 7;
    
    // 1 pound = 3500 calories
    const dailyDeficit = (weeklyLoss * 3500) / 7 / 2.2; // Convert kg to lbs

    return {
      dailyDeficit: Math.round(dailyDeficit),
      weeklyLoss,
      estimatedCompletion: daysToTarget,
      feasible: Math.abs(dailyDeficit) <= 1000 // Max safe deficit/surplus
    };
  }
}

module.exports = new LinearRegressionService();