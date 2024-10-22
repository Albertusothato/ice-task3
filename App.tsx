import React, { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity, StyleSheet, FlatList, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

type Card = {
  id: number;
  type: string;
  isFlipped: boolean;
  isMatched: boolean;
};

const items = ['Plastic', 'Paper', 'Glass', 'Metal', 'Plastic', 'Paper', 'Glass', 'Metal', 'Contaminant'];


const shuffleArray = (array: any[]) => array.sort(() => 0.5 - Math.random());


const HomeScreen = ({ navigation }: { navigation: any }) => (
  <View style={styles.container}>
    <Text style={styles.title}>Recycling Challenge</Text>
    <Text>Match pairs of recyclable materials before the Garbage Truck arrives!</Text>
    <Button title="Start Recycling" onPress={() => navigation.navigate('Game')} />
    <Button title="View Leaderboard" onPress={() => navigation.navigate('Leaderboard')} />
  </View>
);


const GameScreen = ({ navigation }: { navigation: any }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<Card[]>([]);
  const [matches, setMatches] = useState(0);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(60);
  const [gameOver, setGameOver] = useState(false);
  const [recyclingRush, setRecyclingRush] = useState(false);

  
  useEffect(() => {
    const shuffledItems = shuffleArray(items);
    const newCards = shuffledItems.map((item, index) => ({
      id: index,
      type: item,
      isFlipped: false,
      isMatched: false,
    }));
    setCards(newCards);
  }, []);


  useEffect(() => {
    if (time > 0 && matches < 4) {
      const timer = setTimeout(() => {
        if (time <= 10) setRecyclingRush(true); 
        setTime(time - 1);
      }, recyclingRush ? 500 : 1000); 
      return () => clearTimeout(timer);
    } else if (time === 0 || matches >= 4) {
      setGameOver(true);
      Alert.alert('Garbage Truck Arrived!', `You ran out of time! Your score: ${score}`);
      saveScore(score, 60 - time); // Save the score when time runs out
      navigation.navigate('Result', { score, time: 60 - time });
    }
  }, [time, matches, recyclingRush]);

  
  const handleCardFlip = (card: Card) => {
    if (flippedCards.length === 2 || card.isFlipped || card.isMatched) return;

    const newCards = cards.map((c) => (c.id === card.id ? { ...c, isFlipped: true } : c));
    setCards(newCards);

    const newFlippedCards = [...flippedCards, card];
    setFlippedCards(newFlippedCards);

    if (newFlippedCards.length === 2) {
      const [firstCard, secondCard] = newFlippedCards;

      if (firstCard.type === secondCard.type && firstCard.type !== 'Contaminant') {
        setMatches(matches + 1);
        setScore(score + 100);
        const updatedCards = newCards.map((c) =>
          c.id === firstCard.id || c.id === secondCard.id ? { ...c, isMatched: true } : c
        );
        setCards(updatedCards);
      } else if (firstCard.type === 'Contaminant' || secondCard.type === 'Contaminant') {
        setScore(score - 50);
      }
      setTimeout(() => {
        const resetCards = newCards.map((c) =>
          c.id === firstCard.id || c.id === secondCard.id ? { ...c, isFlipped: false } : c
        );
        setCards(resetCards);
        setFlippedCards([]);
      }, 1000);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recycling Bin</Text>
      <Text style={styles.timer}>Time left: {time}s</Text>
      {recyclingRush && <Text style={styles.rush}>Recycling Rush Activated!</Text>}
      <FlatList
        data={cards}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleCardFlip(item)}
            style={styles.card}
            accessibilityLabel={item.type}
          >
            <Text>{item.isFlipped || item.isMatched ? item.type : '?'}</Text>
          </TouchableOpacity>
        )}
      />
      {gameOver && <Button title="Recycle More" onPress={() => navigation.navigate('Result', { score, time: 60 - time })} />}
    </View>
  );
};


const saveScore = async (score: number, time: number) => {
  try {
    const pastScores = (await AsyncStorage.getItem('scores')) || '[]';
    const scoresArray = JSON.parse(pastScores);
    scoresArray.push({ score, time });
    await AsyncStorage.setItem('scores', JSON.stringify(scoresArray));
  } catch (error) {
    console.log('Error saving score:', error);
  }
};


const ResultScreen = ({ route, navigation }: { route: any; navigation: any }) => {
  const { score, time } = route.params;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recycling Points: {score}</Text>
      <Text>Completion Time: {time}s</Text>
      <Button title="Recycle More" onPress={() => navigation.navigate('Home')} />
    </View>
  );
};


const LeaderboardScreen = () => {
  const [scores, setScores] = useState<{ score: number; time: number }[]>([]);

  useEffect(() => {
    const loadScores = async () => {
      try {
        const pastScores = (await AsyncStorage.getItem('scores')) || '[]';
        setScores(JSON.parse(pastScores));
      } catch (error) {
        console.log('Error loading scores:', error);
      }
    };

    loadScores();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>
      {scores.length === 0 ? (
        <Text>No scores yet!</Text>
      ) : (
        scores.map((entry, index) => (
          <Text key={index}>
            Game {index + 1}: {entry.score} points in {entry.time}s
          </Text>
        ))
      )}
    </View>
  );
};

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Game" component={GameScreen} />
        <Stack.Screen name="Result" component={ResultScreen} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#ddd',
    padding: 20,
    margin: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
  },
  timer: {
    fontSize: 18,
    marginBottom: 10,
  },
  rush: {
    color: 'red',
    fontSize: 18,
    marginBottom: 10,
  },
});
