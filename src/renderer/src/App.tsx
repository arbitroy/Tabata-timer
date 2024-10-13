import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Layout,
  Typography,
  Select,
  Input,
  Button,
  List,
  Progress,
  Card,
  Checkbox,
  Modal,
  message,
  Popconfirm
} from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import 'antd/dist/reset.css'
import fightBellSound from './assets/sounds/fight-bell.mp3'
import countdownSound from './assets/sounds/countdown.mp3'

const { Header, Sider, Content } = Layout
const { Title, Text } = Typography
const { Option } = Select

interface TimerState {
  currentTime: number
  isWorkout: boolean
  currentRound: number
  totalRounds: number
  workoutTime: number
  restTime: number
  exercises: string[]
  currentExerciseIndex: number
  isRunning: boolean
}

interface SoundSettings {
  beforeRound: boolean
  beforeRest: boolean
  onlyStart: boolean
  allTransitions: boolean
}

const App: React.FC = () => {
  const [timerState, setTimerState] = useState<TimerState>({
    currentTime: 20,
    isWorkout: true,
    currentRound: 0,
    totalRounds: 8,
    workoutTime: 20,
    restTime: 10,
    exercises: [],
    currentExerciseIndex: 0,
    isRunning: false
  })

  const [totalWorkoutTime, setTotalWorkoutTime] = useState<string>(`3:50`)
  const [mode, setMode] = useState<'tabata' | 'tabata-this'>('tabata')
  const [showScoreInput, setShowScoreInput] = useState<boolean>(false)
  const [score, setScore] = useState<string>('')
  const [showCountdown, setShowCountdown] = useState<boolean>(false)
  const [countdownNumber, setCountdownNumber] = useState<number>(3)
  const [newExercise, setNewExercise] = useState<string>('')
  const [isPaused, setIsPaused] = useState<boolean>(false)

  const fightBellAudioRef = useRef<HTMLAudioElement | null>(null)
  const countdownAudioRef = useRef<HTMLAudioElement | null>(null)

  const [soundSettings, setSoundSettings] = useState<SoundSettings>({
    beforeRound: false,
    beforeRest: false,
    onlyStart: false,
    allTransitions: false
  })

  useEffect(() => {
    fightBellAudioRef.current = new Audio(fightBellSound)
    countdownAudioRef.current = new Audio(countdownSound)
  }, [])

  const playSound = useCallback((sound: 'fightBell' | 'countdown'): void => {
    const audio = sound === 'fightBell' ? fightBellAudioRef.current : countdownAudioRef.current
    if (audio) {
      audio.currentTime = 0
      audio.play().catch((error) => {
        console.error('Error playing sound:', error)
      })
    }
  }, [])

  const togglePause = useCallback((): void => {
    setIsPaused((prev) => !prev)
    setTimerState((prev) => ({ ...prev, isRunning: !isPaused }))
  }, [isPaused])

  const selectExercise = useCallback((index: number): void => {
    setTimerState((prev) => ({
      ...prev,
      currentExerciseIndex: index,
      currentTime: prev.workoutTime,
      isWorkout: true,
      isRunning: false
    }))
    setIsPaused(false)
  }, [])

  const deleteExercise = useCallback((index: number): void => {
    setTimerState((prev) => {
      const newExercises = [...prev.exercises]
      newExercises.splice(index, 1)
      return {
        ...prev,
        exercises: newExercises,
        currentExerciseIndex:
          prev.currentExerciseIndex >= newExercises.length
            ? Math.max(0, newExercises.length - 1)
            : prev.currentExerciseIndex
      }
    })
  }, [])

  const updateTimerDisplay = useCallback((): string => {
    const minutes = Math.floor(timerState.currentTime / 60)
      .toString()
      .padStart(2, '0')
    const seconds = (timerState.currentTime % 60).toString().padStart(2, '0')
    return `${minutes}:${seconds}`
  }, [timerState.currentTime])

  const updateProgressBar = useCallback((): number => {
    const totalTime = timerState.isWorkout ? timerState.workoutTime : timerState.restTime
    return ((totalTime - timerState.currentTime) / totalTime) * 100
  }, [timerState])

  const startTimer = useCallback((): void => {
    if (timerState.exercises.length === 0) {
      message.error('Please add at least one exercise before starting the timer.')
      return
    }
    playSound('countdown')
    setShowCountdown(true)
    setCountdownNumber(3)
  }, [timerState.exercises])

  // Countdown logic
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined
    if (showCountdown) {
      interval = setInterval(() => {
        setCountdownNumber((prev) => {
          if (prev === 1) {
            clearInterval(interval)
            setShowCountdown(false)
            setTimerState((prevState) => ({
              ...prevState,
              currentTime: prevState.workoutTime,
              currentRound: 1,
              isWorkout: true,
              isRunning: true
            }))
            setIsPaused(false)
          }
          return prev - 1
        })
      }, 1000)
    }
    return (): void => {
      if (interval) clearInterval(interval)
    }
  }, [showCountdown, playSound])

  // Main timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined
    if (timerState.isRunning && !isPaused) {
      interval = setInterval(() => {
        setTimerState((prev) => {
          const newState = { ...prev }
          newState.currentTime--

          // Play countdown sound for last 3 seconds of each period
          if (newState.currentTime <= 4 && newState.currentTime > 0) {
            playSound('countdown')
          }

          if (newState.currentTime < 0) {
            if (newState.isWorkout) {
              if (newState.currentRound >= newState.totalRounds) {
                clearInterval(interval)
                newState.isRunning = false
                setShowScoreInput(true)
                return newState
              }
              newState.isWorkout = false
              newState.currentTime = newState.restTime
            } else {
              newState.isWorkout = true
              newState.currentTime = newState.workoutTime
              newState.currentRound++
              newState.currentExerciseIndex =
                (newState.currentExerciseIndex + 1) % newState.exercises.length
            }
          }

          return newState
        })
      }, 1000)
    }
    return (): void => {
      if (interval) clearInterval(interval)
    }
  }, [timerState.isRunning, isPaused, playSound])

  const resetTimer = useCallback((): void => {
    setTimerState((prev) => ({
      ...prev,
      currentTime: prev.workoutTime,
      currentRound: 0,
      isWorkout: true,
      currentExerciseIndex: 0,
      isRunning: false
    }))
    setIsPaused(false)
    setShowScoreInput(false)
  }, [])

  const addExercise = useCallback((): void => {
    if (newExercise.trim()) {
      setTimerState((prev) => ({
        ...prev,
        exercises: [...prev.exercises, newExercise.trim()]
      }))
      setNewExercise('')
    } else {
      message.warning('Please enter an exercise name.')
    }
  }, [newExercise])

  const saveScore = useCallback((): void => {
    if (score.trim()) {
      console.log(`Saving score: ${score}`)
      // Here you would typically send this data to a server
      message.success('Score saved successfully!')
      setShowScoreInput(false)
      setScore('')
    } else {
      message.warning('Please enter a valid score.')
    }
  }, [score])

  const handleModeChange = useCallback(
    (newMode: 'tabata' | 'tabata-this'): void => {
      setMode(newMode)
      if (newMode === 'tabata') {
        setTimerState((prev) => ({
          ...prev,
          workoutTime: 20,
          restTime: 10,
          totalRounds: 8
        }))
        setTotalWorkoutTime('3:50')
      } else if (newMode === 'tabata-this') {
        setTimerState((prev) => ({
          ...prev,
          workoutTime: 20,
          restTime: 10,
          totalRounds: 40
        }))
        setTotalWorkoutTime('23:50')
      }
      resetTimer()
    },
    [resetTimer]
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: 0 }}>
        <Title level={2} style={{ margin: '10px 20px' }}>
          Tabata Timer
        </Title>
      </Header>
      <Layout>
        <Sider width={300} style={{ background: '#fff' }}>
          <Card title="Workout Settings" style={{ margin: '20px' }}>
            <Select style={{ width: '100%' }} value={mode} onChange={handleModeChange}>
              <Option value="tabata">Tabata</Option>
              <Option value="tabata-this">Tabata This</Option>
            </Select>
          </Card>
          <Card title="Exercises" style={{ margin: '20px' }}>
            <Input
              value={newExercise}
              onChange={(e) => setNewExercise(e.target.value)}
              onPressEnter={addExercise}
              placeholder="Enter exercise name"
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={addExercise}
              style={{ marginTop: '10px' }}
            >
              Add Exercise
            </Button>
            <List
              style={{ marginTop: '20px' }}
              dataSource={timerState.exercises}
              renderItem={(item, index) => (
                <List.Item
                  key={`exercise-${index}`}
                  style={{
                    fontWeight: index === timerState.currentExerciseIndex ? 'bold' : 'normal'
                  }}
                  actions={[
                    <Button key="start" onClick={() => selectExercise(index)}>
                      Start
                    </Button>,
                    <Popconfirm
                      key="delete"
                      title="Are you sure you want to delete this exercise?"
                      onConfirm={() => deleteExercise(index)}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                  ]}
                >
                  {item}
                </List.Item>
              )}
            />
          </Card>
        </Sider>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280 }}>
          <Card
            title={timerState.exercises[timerState.currentExerciseIndex] || 'No exercise'}
            style={{ textAlign: 'center' }}
          >
            <Title style={{ fontSize: '115px' }}>{updateTimerDisplay()}</Title>
            <Text>
              Round: {timerState.currentRound}/{timerState.totalRounds}
            </Text>
            <Progress
              percent={updateProgressBar()}
              showInfo={false}
              style={{ marginTop: '20px' }}
            />
            <Button.Group style={{ marginTop: '20px' }}>
              {!timerState.isRunning && !isPaused && (
                <Button type="primary" icon={<PlayCircleOutlined />} onClick={startTimer}>
                  Start
                </Button>
              )}
              {timerState.isRunning && !isPaused && (
                <Button type="primary" icon={<PauseCircleOutlined />} onClick={togglePause}>
                  Pause
                </Button>
              )}
              {isPaused && (
                <Button type="primary" icon={<PlayCircleOutlined />} onClick={togglePause}>
                  Resume
                </Button>
              )}
              <Button icon={<ReloadOutlined />} onClick={resetTimer}>
                Reset
              </Button>
            </Button.Group>
          </Card>
          <Card title="Sound Settings" style={{ marginTop: '20px' }}>
            {Object.entries(soundSettings).map(([key, value]) => (
              <Checkbox
                key={key}
                checked={value}
                onChange={() => setSoundSettings((prev) => ({ ...prev, [key]: !prev[key] }))}
              >
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
              </Checkbox>
            ))}
          </Card>
          <Card title="Workout Summary" style={{ marginTop: '20px' }}>
            <Text>Total Workout Time: {totalWorkoutTime}</Text>
            <br />
            <Text>
              Time On: {timerState.workoutTime} seconds | Time Off: {timerState.restTime} seconds
            </Text>
          </Card>
        </Content>
      </Layout>
      <Modal
        title="Workout Score"
        open={showScoreInput}
        onOk={saveScore}
        onCancel={() => setShowScoreInput(false)}
      >
        <Input
          value={score}
          onChange={(e) => setScore(e.target.value)}
          placeholder="Enter your score"
        />
      </Modal>
      <Modal title="Countdown" open={showCountdown} footer={null} closable={false} centered>
        <Title style={{ textAlign: 'center' }}>{countdownNumber}</Title>
      </Modal>
    </Layout>
  )
}

export default App
