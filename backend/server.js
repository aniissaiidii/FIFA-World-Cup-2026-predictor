const express = require('express');
const cors = require('cors');
const fs = require('fs');
const csv = require('csv-parser');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

const MODEL_VERSION = 'world-cup-v4-fixed';

let matchesData = [];
let statsData = [];

const groups = {
  A: ['Mexico', 'South Africa', 'South Korea', 'Czech Republic'],
  B: ['Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland'],
  C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  D: ['United States', 'Paraguay', 'Australia', 'Turkiye'],
  E: ['Germany', 'Curacao', 'Ivory Coast', 'Ecuador'],
  F: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
  G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  H: ['Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay'],
  I: ['France', 'Senegal', 'Iraq', 'Norway'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'DR Congo', 'Uzbekistan', 'Colombia'],
  L: ['England', 'Croatia', 'Ghana', 'Panama']
};

const ratings = {
  'Argentina': 96,
  'France': 95,
  'Brazil': 94,
  'England': 92,
  'Spain': 92,
  'Portugal': 91,
  'Germany': 90,
  'Netherlands': 90,
  'Belgium': 88,
  'Uruguay': 87,
  'Croatia': 86,
  'Colombia': 85,
  'Morocco': 84,
  'Switzerland': 83,
  'Japan': 82,
  'Senegal': 82,
  'Austria': 81,
  'Ecuador': 80,
  'Sweden': 80,
  'Iran': 79,
  'South Korea': 79,
  'Mexico': 78,
  'United States': 78,
  'Australia': 76,
  'Tunisia': 76,
  'Ivory Coast': 75,
  'Egypt': 75,
  'Algeria': 74,
  'Ghana': 74,
  'Czech Republic': 73,
  'Norway': 73,
  'Scotland': 72,
  'Canada': 72,
  'Paraguay': 72,
  'Turkiye': 71,
  'South Africa': 69,
  'Qatar': 68,
  'Saudi Arabia': 68,
  'Uzbekistan': 67,
  'Iraq': 66,
  'Jordan': 64,
  'Panama': 63,
  'Bosnia and Herzegovina': 63,
  'DR Congo': 62,
  'Cape Verde': 61,
  'New Zealand': 60,
  'Haiti': 57,
  'Curacao': 55
};

const displayNames = {
  'United States': 'USA',
  'Czech Republic': 'Czechia',
  'South Korea': 'Korea Republic',
  'Iran': 'IR Iran',
  'Cape Verde': 'Cabo Verde',
  'Ivory Coast': "Côte d'Ivoire",
  'DR Congo': 'Congo DR',
  'Turkiye': 'Türkiye',
  'Curacao': 'Curaçao'
};

function normalizeTeamName(name) {
  if (!name) return '';

  const clean = String(name).trim();

  const aliases = {
    'USA': 'United States',
    'Czechia': 'Czech Republic',
    'Korea Republic': 'South Korea',
    'IR Iran': 'Iran',
    'Cabo Verde': 'Cape Verde',
    "Côte d'Ivoire": 'Ivory Coast',
    "Cote d'Ivoire": 'Ivory Coast',
    'Ivory Coast': 'Ivory Coast',
    'Congo DR': 'DR Congo',
    'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
    'Bosnia and Herzegovina': 'Bosnia and Herzegovina',
    'Türkiye': 'Turkiye',
    'Turkiye': 'Turkiye',
    'TÃ¼rkiye': 'Turkiye',
    'Curaçao': 'Curacao',
    'Curacao': 'Curacao',
    'CuraÃ§ao': 'Curacao'
  };

  return aliases[clean] || clean;
}

function showName(team) {
  return displayNames[team] || team;
}

function getRating(team) {
  return ratings[normalizeTeamName(team)] || 65;
}

function getTeamStats(teamName) {
  const team = normalizeTeamName(teamName);
  const rating = getRating(team);

  const csvStats = statsData.find(row => normalizeTeamName(row.team) === team);

  if (csvStats) {
    const matches = Number(csvStats.total_matches || csvStats.matches || 40) || 40;
    const wins = Number(csvStats.wins || 0);
    const draws = Number(csvStats.draws || 0);
    const losses = Number(csvStats.losses || 0);
    const goalsFor = Number(csvStats.goals_for || 0);
    const goalsAgainst = Number(csvStats.goals_against || 0);

    return {
      team,
      rating,
      matches,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      winRate: wins / matches,
      avgGoalsFor: goalsFor / matches,
      avgGoalsAgainst: goalsAgainst / matches
    };
  }

  const strength = rating / 100;

  return {
    team,
    rating,
    matches: 40,
    wins: Math.round(8 + strength * 20),
    draws: Math.round(5 + strength * 5),
    losses: Math.round(27 - strength * 16),
    goalsFor: Math.round(28 + strength * 62),
    goalsAgainst: Math.round(70 - strength * 42),
    winRate: (8 + strength * 20) / 40,
    avgGoalsFor: (28 + strength * 62) / 40,
    avgGoalsAgainst: (70 - strength * 42) / 40
  };
}

function makeScore(ratingDiff, team1Attack, team2Attack) {
  const abs = Math.abs(ratingDiff);

  let strongGoals;
  let weakGoals;

  if (abs >= 32) {
    strongGoals = 4;
    weakGoals = 0;
  } else if (abs >= 26) {
    strongGoals = 3;
    weakGoals = 0;
  } else if (abs >= 20) {
    strongGoals = 3;
    weakGoals = 1;
  } else if (abs >= 14) {
    strongGoals = 2;
    weakGoals = 0;
  } else if (abs >= 8) {
    strongGoals = 2;
    weakGoals = 1;
  } else if (abs >= 4) {
    strongGoals = 1;
    weakGoals = 0;
  } else {
    strongGoals = 1;
    weakGoals = 1;
  }

  if (abs >= 20 && Math.max(team1Attack, team2Attack) > 1.9) {
    strongGoals += 1;
  }

  if (ratingDiff >= 0) {
    return [strongGoals, weakGoals];
  }

  return [weakGoals, strongGoals];
}

function predictMatch(team1Input, team2Input) {
  const team1 = normalizeTeamName(team1Input);
  const team2 = normalizeTeamName(team2Input);

  const s1 = getTeamStats(team1);
  const s2 = getTeamStats(team2);

  const form1 = s1.rating + s1.winRate * 8 + s1.avgGoalsFor * 2 - s1.avgGoalsAgainst * 2;
  const form2 = s2.rating + s2.winRate * 8 + s2.avgGoalsFor * 2 - s2.avgGoalsAgainst * 2;

  const diff = form1 - form2;
  const ratingDiff = s1.rating - s2.rating;

  const [goals1, goals2] = makeScore(ratingDiff, s1.avgGoalsFor, s2.avgGoalsFor);

  let prediction = 'Draw';
  let winner = null;

  if (goals1 > goals2) {
    prediction = `${showName(team1)} Win`;
    winner = showName(team1);
  } else if (goals2 > goals1) {
    prediction = `${showName(team2)} Win`;
    winner = showName(team2);
  }

  const confidence = Math.round(Math.max(45, Math.min(94, 48 + Math.abs(ratingDiff) * 1.25)));

  const result = {
    model_version: MODEL_VERSION,
    team1: showName(team1),
    team2: showName(team2),
    predicted_score: `${goals1} - ${goals2}`,
    prediction,
    winner,
    confidence,
    strength: {
      team1: Math.round(form1),
      team2: Math.round(form2),
      difference: Math.round(diff),
      rating_difference: ratingDiff
    },
    team1_stats: {
      rating: s1.rating,
      avg_goals_for: s1.avgGoalsFor.toFixed(2),
      avg_goals_against: s1.avgGoalsAgainst.toFixed(2),
      win_rate: (s1.winRate * 100).toFixed(1)
    },
    team2_stats: {
      rating: s2.rating,
      avg_goals_for: s2.avgGoalsFor.toFixed(2),
      avg_goals_against: s2.avgGoalsAgainst.toFixed(2),
      win_rate: (s2.winRate * 100).toFixed(1)
    }
  };

  console.log('PREDICT:', result);
  return result;
}

function generateGroupMatches() {
  const matches = [];

  Object.entries(groups).forEach(([group, teams]) => {
    matches.push(
      { team1: showName(teams[0]), team2: showName(teams[1]), stage: `Group ${group}` },
      { team1: showName(teams[2]), team2: showName(teams[3]), stage: `Group ${group}` },
      { team1: showName(teams[0]), team2: showName(teams[2]), stage: `Group ${group}` },
      { team1: showName(teams[1]), team2: showName(teams[3]), stage: `Group ${group}` },
      { team1: showName(teams[0]), team2: showName(teams[3]), stage: `Group ${group}` },
      { team1: showName(teams[1]), team2: showName(teams[2]), stage: `Group ${group}` }
    );
  });

  return matches;
}

function loadData() {
  matchesData = [];
  statsData = [];

  if (fs.existsSync('../scraper/data/matches.csv')) {
    fs.createReadStream('../scraper/data/matches.csv')
      .pipe(csv())
      .on('data', row => matchesData.push(row))
      .on('end', () => console.log('Matches loaded'));
  }

  if (fs.existsSync('../scraper/data/team_stats.csv')) {
    fs.createReadStream('../scraper/data/team_stats.csv')
      .pipe(csv())
      .on('data', row => statsData.push(row))
      .on('end', () => console.log('Stats loaded'));
  }
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    model_version: MODEL_VERSION
  });
});

app.get('/api/matches', (req, res) => {
  res.json(matchesData);
});

app.get('/api/worldcup-matches', (req, res) => {
  res.json(generateGroupMatches());
});

app.get('/api/teams', (req, res) => {
  res.json(
    Object.values(groups)
      .flat()
      .map(team => ({
        name: showName(team),
        rating: getRating(team)
      }))
  );
});

app.get('/api/stats/:team', (req, res) => {
  const stats = getTeamStats(req.params.team);
  res.json(stats);
});

app.post('/api/predict', (req, res) => {
  const { team1, team2 } = req.body;

  if (!team1 || !team2) {
    return res.status(400).json({ error: 'Teams required' });
  }

  res.json(predictMatch(team1, team2));
});

app.get('/api/generate-predictions', (req, res) => {
  const predictions = generateGroupMatches().map(match =>
    predictMatch(match.team1, match.team2)
  );

  res.json({
    model_version: MODEL_VERSION,
    count: predictions.length,
    data: predictions
  });
});

app.get('/api/ranking', (req, res) => {
  const ranking = Object.values(groups)
    .flat()
    .map(team => {
      const stats = getTeamStats(team);

      return {
        team: showName(stats.team),
        rating: stats.rating,
        matches: stats.matches,
        wins: stats.wins,
        draws: stats.draws,
        losses: stats.losses,
        goals_for: stats.goalsFor,
        goals_against: stats.goalsAgainst,
        goal_difference: stats.goalsFor - stats.goalsAgainst,
        points: stats.wins * 3 + stats.draws
      };
    })
    .sort((a, b) =>
      b.rating - a.rating ||
      b.points - a.points ||
      b.goal_difference - a.goal_difference
    )
    .map((team, index) => ({
      rank: index + 1,
      code: team.team.slice(0, 3).toUpperCase(),
      ...team
    }));

  res.json(ranking);
});
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    model_version: MODEL_VERSION
  });
});
loadData();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Model version: ${MODEL_VERSION}`);
});