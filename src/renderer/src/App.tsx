import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Layout,
  Typography,
  Input,
  Button,
  List,
  Progress,
  Card,
  Checkbox,
  Modal,
  message,
  Popconfirm,
  InputNumber,
  ConfigProvider
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
  const [showScoreInput, setShowScoreInput] = useState<boolean>(false)
  const [score, setScore] = useState<string>('')
  const [showCountdown, setShowCountdown] = useState<boolean>(false)
  const [countdownNumber, setCountdownNumber] = useState<number>(3)
  const [newExercise, setNewExercise] = useState<string>('')
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [isInitialCountdownFinished, setIsInitialCountdownFinished] = useState<boolean>(false)

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
    setTimerState((prev) => ({ ...prev, isRunning: !prev.isRunning }))
  }, [])

  const shouldPlaySound = useCallback(
    (isWorkout: boolean, isStart: boolean): boolean => {
      if (soundSettings.allTransitions) return true
      if (soundSettings.onlyStart && isStart) return true
      if (soundSettings.beforeRound && isWorkout) return true
      if (soundSettings.beforeRest && !isWorkout) return true
      return false
    },
    [soundSettings]
  )

  const playInitialFightBell = useCallback((): void => {
    if (shouldPlaySound(true, true)) {
      playSound('fightBell')
    }
    setTimerState((prev) => ({
      ...prev,
      currentTime: prev.workoutTime,
      currentRound: 1,
      isWorkout: true,
      isRunning: true
    }))
    setIsPaused(false)
    setIsInitialCountdownFinished(true)
  }, [shouldPlaySound, playSound])

  const selectExercise = useCallback((index: number): void => {
    setTimerState((prev) => ({
      ...prev,
      currentExerciseIndex: index,
      currentTime: prev.workoutTime,
      isWorkout: true,
      isRunning: false
    }))
    setIsPaused(false)
    setIsInitialCountdownFinished(false)
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
    setIsInitialCountdownFinished(false)
  }, [timerState.exercises, playSound])

  // Countdown logic
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined
    if (showCountdown) {
      interval = setInterval(() => {
        setCountdownNumber((prev) => {
          if (prev === 1) {
            clearInterval(interval)
            setShowCountdown(false)
            playInitialFightBell()
            return prev
          }
          playSound('countdown')
          return prev - 1
        })
      }, 1000)
    }
    return (): void => {
      if (interval) clearInterval(interval)
    }
  }, [showCountdown, playSound, playInitialFightBell])

  // Main timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined
    if (timerState.isRunning && !isPaused && isInitialCountdownFinished) {
      interval = setInterval(() => {
        setTimerState((prev) => {
          const newState = { ...prev }
          newState.currentTime--

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
              if (shouldPlaySound(false, false)) {
                playSound('fightBell')
              }
            } else {
              newState.isWorkout = true
              newState.currentTime = newState.workoutTime
              newState.currentRound++
              newState.currentExerciseIndex =
                (newState.currentExerciseIndex + 1) % newState.exercises.length
              if (shouldPlaySound(true, false)) {
                playSound('fightBell')
              }
            }
          }

          return newState
        })
      }, 1000)
    }
    return (): void => {
      if (interval) clearInterval(interval)
    }
  }, [timerState.isRunning, isPaused, isInitialCountdownFinished, shouldPlaySound, playSound])

  // New effect for playing countdown sound during the main timer
  useEffect(() => {
    if (timerState.isRunning && !isPaused && isInitialCountdownFinished) {
      if (timerState.currentTime <= 3 && timerState.currentTime > 0) {
        playSound('countdown')
      }
    }
  }, [
    timerState.isRunning,
    isPaused,
    isInitialCountdownFinished,
    timerState.currentTime,
    playSound
  ])

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
    setIsInitialCountdownFinished(false)
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

  const updateTotalWorkoutTime = useCallback(() => {
    const totalSeconds = timerState.totalRounds * (timerState.workoutTime + timerState.restTime)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    setTotalWorkoutTime(`${minutes}:${seconds.toString().padStart(2, '0')}`)
  }, [timerState.totalRounds, timerState.workoutTime, timerState.restTime])

  useEffect(() => {
    updateTotalWorkoutTime()
  }, [timerState.totalRounds, timerState.workoutTime, timerState.restTime, updateTotalWorkoutTime])

  const handleSettingChange = useCallback(
    (key: keyof TimerState, value: number) => {
      setTimerState((prev) => ({ ...prev, [key]: value }))
      resetTimer()
    },
    [resetTimer]
  )

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          colorSuccess: '#52c41a',
          colorWarning: '#FC5130',
          colorError: '#f5222d',
          colorInfo: '#1890ff'
        }
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ background: '#5B616A', padding: 0 }}>
          <Title level={2} style={{ margin: '10px 20px', color: 'white' }}>
            Tabata Timer
          </Title>
        </Header>
        <Layout>
          <Sider width={300} style={{ background: '#f0f2f5' }}>
            <Card
              title="Timer Settings"
              style={{ margin: '20px' }}
              headStyle={{ background: '#5B616A', color: 'white' }}
            >
              <div style={{ marginBottom: '10px' }}>
                <Text strong>Rounds:</Text>
                <InputNumber
                  min={1}
                  max={100}
                  value={timerState.totalRounds}
                  onChange={(value) => handleSettingChange('totalRounds', value as number)}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <Text strong>Workout Time (seconds):</Text>
                <InputNumber
                  min={1}
                  max={300}
                  value={timerState.workoutTime}
                  onChange={(value) => handleSettingChange('workoutTime', value as number)}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <Text strong>Rest Time (seconds):</Text>
                <InputNumber
                  min={1}
                  max={300}
                  value={timerState.restTime}
                  onChange={(value) => handleSettingChange('restTime', value as number)}
                  style={{ width: '100%' }}
                />
              </div>
            </Card>
            <Card
              title="Exercises"
              style={{ margin: '20px' }}
              headStyle={{ background: '#5B616A', color: 'white' }}
            >
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
                style={{ marginTop: '10px', background: '#5B616A', borderColor: '#5B616A' }}
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
                      fontWeight: index === timerState.currentExerciseIndex ? 'bold' : 'normal',
                      background:
                        index === timerState.currentExerciseIndex ? '#e6f7ff' : 'transparent',
                      paddingLeft: `10px`
                    }}
                    actions={[
                      <Button
                        key="start"
                        onClick={() => selectExercise(index)}
                        style={{ background: '#1890ff', borderColor: '#1890ff', color: 'white' }}
                      >
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
              headStyle={{ background: '#5B616A', color: 'white' }}
            >
              <Title
                style={{ fontSize: '115px', color: timerState.isWorkout ? '#275DAD' : '#FC5130' }}
              >
                {updateTimerDisplay()}
              </Title>
              <Text strong style={{ fontSize: '24px' }}>
                Round: {timerState.currentRound}/{timerState.totalRounds}
              </Text>
              <Progress
                percent={updateProgressBar()}
                showInfo={false}
                style={{ marginTop: '20px' }}
                strokeColor={timerState.isWorkout ? '#275DAD' : '#FC5130'}
              />
              <Button.Group style={{ marginTop: '20px' }}>
                {!timerState.isRunning && !isPaused && (
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={startTimer}
                    size="large"
                  >
                    Start
                  </Button>
                )}
                {timerState.isRunning && !isPaused && (
                  <Button
                    type="primary"
                    icon={<PauseCircleOutlined />}
                    onClick={togglePause}
                    size="large"
                    danger
                  >
                    Pause
                  </Button>
                )}
                {isPaused && (
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={togglePause}
                    size="large"
                    style={{ background: '#FC5130', borderColor: '#FC5130' }}
                  >
                    Resume
                  </Button>
                )}
                <Button icon={<ReloadOutlined />} onClick={resetTimer} size="large">
                  Reset
                </Button>
              </Button.Group>
            </Card>
            <Card
              title="Workout Summary"
              style={{ marginTop: '20px' }}
              headStyle={{ background: '#5B616A', color: 'white' }}
            >
              <Text strong>Total Workout Time: {totalWorkoutTime}</Text>
              <br />
              <Text strong>
                Time On: <span style={{ color: '#52c41a' }}>{timerState.workoutTime} seconds</span>{' '}
                | Time Off: <span style={{ color: '#FC5130' }}>{timerState.restTime} seconds</span>
              </Text>
            </Card>
          </Content>
          <Sider width={300} style={{ background: '#f0f2f5' }}>
            <Card
              title="Sound Settings"
              style={{ margin: '20px' }}
              headStyle={{ background: '#5B616A', color: 'white' }}
            >
              {Object.entries(soundSettings).map(([key, value]) => (
                <Checkbox
                  key={key}
                  checked={value}
                  onChange={() => setSoundSettings((prev) => ({ ...prev, [key]: !prev[key] }))}
                  style={{ marginBottom: '10px', marginRight: '8px' }}
                >
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                </Checkbox>
              ))}
            </Card>
          </Sider>
        </Layout>
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
        <Title style={{ textAlign: 'center', color: '#1890ff' }}>{countdownNumber}</Title>
      </Modal>
    </ConfigProvider>
  )
}

export default App
