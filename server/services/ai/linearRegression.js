// server/services/ai/linearRegression.js - FIXED TREND CALCULATION
const MLRegression = require('ml-regression');

class LinearRegressionService {
  predictWeight(progressData, daysAhead = 30) {
    if (!progressData || progressData.length < 2) {
      throw new Error('Insufficient data for prediction');
    }

    // ✅ FIX: Sort data oldest to newest for correct time series
    // Data comes in as "most recent first", we need "oldest first"
    const sortedData = [...progressData].sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateA - dateB; // Oldest first
    });

    console.log('📊 Sorted data for regression (oldest → newest):', 
      sortedData.slice(0, 3).map(d => ({
        weight: d.weight,
        date: d.date
      }))
    );

    // Prepare data for regression (index = days from start)
    const x = sortedData.map((_, index) => [index]);
    const y = sortedData.map(data => parseFloat(data.weight));

    console.log('📈 Regression input:', {
      xSample: x.slice(0, 3),
      ySample: y.slice(0, 3)
    });

    // Create and train the model
    const regression = new MLRegression.PolynomialRegression(x, y, 2);

    // Generate predictions starting from the LAST data point
    const predictions = [];
    const lastIndex = sortedData.length - 1;
    const lastDate = sortedData[lastIndex].date?.toDate ? 
      sortedData[lastIndex].date.toDate() : 
      new Date(sortedData[lastIndex].date);
    
    for (let i = 1; i <= daysAhead; i++) {
      const predictedWeight = regression.predict(lastIndex + i);
      const futureDate = new Date(lastDate);
      futureDate.setDate(futureDate.getDate() + i);
      
      predictions.push({
        day: i,
        date: futureDate.toISOString(),
        weight: Math.max(30, Math.min(300, predictedWeight)) // Sanity limits
      });
    }

    console.log('✅ Generated predictions:', {
      count: predictions.length,
      first: predictions[0],
      last: predictions[predictions.length - 1]
    });

    return {
      predictions,
      equation: regression.toString(),
      r2: regression.score(x, y),
      trend: this.calculateTrend(progressData)
    };
  }

  calculateTrend(data) {
    if (data.length < 2) return { direction: 'insufficient_data' };
    
    // ✅ FIX: Sort oldest to newest for correct trend calculation
    const sortedData = [...data].sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateA - dateB; // Oldest first
    });
    
    const firstWeight = parseFloat(sortedData[0].weight);
    const lastWeight = parseFloat(sortedData[sortedData.length - 1].weight);
    
    // ✅ Calculate change from first to last (oldest to newest)
    const totalChange = lastWeight - firstWeight;
    
    // Calculate time span in days
    const firstDate = sortedData[0].date?.toDate ? 
      sortedData[0].date.toDate() : 
      new Date(sortedData[0].date);
    const lastDate = sortedData[sortedData.length - 1].date?.toDate ? 
      sortedData[sortedData.length - 1].date.toDate() : 
      new Date(sortedData[sortedData.length - 1].date);
    
    const daysDiff = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24));
    const changePerWeek = (totalChange / daysDiff) * 7;

    console.log('📉 Trend calculation:', {
      firstWeight,
      lastWeight,
      totalChange,
      daysDiff,
      changePerWeek,
      direction: totalChange < -0.1 ? 'losing' : totalChange > 0.1 ? 'gaining' : 'maintaining'
    });

    return {
      totalChange: parseFloat(totalChange.toFixed(2)),
      weeklyChange: parseFloat(changePerWeek.toFixed(2)),
      direction: totalChange < -0.1 ? 'losing' : totalChange > 0.1 ? 'gaining' : 'maintaining',
      pace: Math.abs(changePerWeek) > 1 ? 'fast' : Math.abs(changePerWeek) > 0.5 ? 'moderate' : 'slow',
      onTrack: true // Could calculate based on user goal
    };
  }

  calculateCalorieDeficit(currentWeight, targetWeight, targetDate) {
    const now = new Date();
    const target = new Date(targetDate);
    const daysToTarget = Math.max(1, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
    
    const weightToChange = targetWeight - currentWeight;
    const weeklyChange = (weightToChange / daysToTarget) * 7;
    
    // 1 kg of body weight ≈ 7700 calories
    // Weekly change in kg × 7700 = weekly calorie change
    // Daily deficit = weekly calorie change / 7
    const dailyDeficit = Math.round((weeklyChange * 7700) / 7);

    const feasible = Math.abs(dailyDeficit) <= 1000; // Max 1000 cal deficit/surplus

    console.log('🍽️ Calorie calculation:', {
      currentWeight,
      targetWeight,
      daysToTarget,
      weeklyChange: weeklyChange.toFixed(2),
      dailyDeficit,
      feasible
    });

    return {
      dailyDeficit,
      weeklyChange: parseFloat(weeklyChange.toFixed(2)),
      estimatedCompletion: daysToTarget,
      feasible
    };
  }
}

module.exports = new LinearRegressionService();