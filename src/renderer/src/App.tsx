import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Layout,
  Typography,
  Button,
  Progress,
  Card,
  Modal,
  InputNumber,
  ConfigProvider,
  Collapse
} from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  SettingOutlined
} from '@ant-design/icons'
import 'antd/dist/reset.css'
import fightBellSound from './assets/sounds/fight-bell.mp3'
import countdownSound from './assets/sounds/countdown.mp3'
import buzzerSound from './assets/sounds/buzzer.mp3'
import whistleSound from './assets/sounds/whistle.mp3'
import celebrationSound from './assets/sounds/celebration.mp3'

const { Header, Content } = Layout
const { Title, Text } = Typography
const { Panel } = Collapse

interface TimerState {
  currentTime: number
  isWorkout: boolean
  currentRound: number
  totalRounds: number
  workoutTime: number
  restTime: number
  isRunning: boolean
  currentCircuit: number
  totalCircuits: number
  betweenCircuitsRestTime: number
  isBetweenCircuitsRest: boolean
}

const App: React.FC = () => {
  const [timerState, setTimerState] = useState<TimerState>({
    currentTime: 20,
    isWorkout: true,
    currentRound: 0,
    totalRounds: 8,
    workoutTime: 20,
    restTime: 10,
    isRunning: false,
    currentCircuit: 1,
    totalCircuits: 1,
    betweenCircuitsRestTime: 30,
    isBetweenCircuitsRest: false
  })

  const [totalWorkoutTime, setTotalWorkoutTime] = useState<string>(`3:50`)
  const [showCountdown, setShowCountdown] = useState<boolean>(false)
  const [countdownNumber, setCountdownNumber] = useState<number>(3)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [isInitialCountdownFinished, setIsInitialCountdownFinished] = useState<boolean>(false)

  const fightBellAudioRef = useRef<HTMLAudioElement | null>(null)
  const countdownAudioRef = useRef<HTMLAudioElement | null>(null)
  const buzzerAudioRef = useRef<HTMLAudioElement | null>(null)
  const whistleAudioRef = useRef<HTMLAudioElement | null>(null)
  const celebrationAudioRef = useRef<HTMLAudioElement | null>(null)
  const hasPlayedCountdownRef = useRef<boolean>(false)

  useEffect(() => {
    fightBellAudioRef.current = new Audio(fightBellSound)
    countdownAudioRef.current = new Audio(countdownSound)
    buzzerAudioRef.current = new Audio(buzzerSound)
    whistleAudioRef.current = new Audio(whistleSound)
    celebrationAudioRef.current = new Audio(celebrationSound)
  }, [])

  const playSound = useCallback(
    (sound: 'fightBell' | 'countdown' | 'buzzer' | 'whistle' | 'celebration'): void => {
      const audioMap = {
        fightBell: fightBellAudioRef,
        countdown: countdownAudioRef,
        buzzer: buzzerAudioRef,
        whistle: whistleAudioRef,
        celebration: celebrationAudioRef
      }
      const audio = audioMap[sound].current
      if (audio) {
        audio.currentTime = 0
        audio.play().catch((error) => {
          console.error('Error playing sound:', error)
        })
      }
    },
    []
  )

  const togglePause = useCallback((): void => {
    setIsPaused((prev) => !prev)
    setTimerState((prev) => ({ ...prev, isRunning: !prev.isRunning }))
  }, [])

  const playInitialFightBell = useCallback((): void => {
    playSound('fightBell')
    setTimerState((prev) => ({
      ...prev,
      currentTime: prev.workoutTime,
      currentRound: 1,
      isWorkout: true,
      isRunning: true
    }))
    setIsPaused(false)
    setIsInitialCountdownFinished(true)
  }, [playSound])

  const updateTimerDisplay = useCallback((): string => {
    const minutes = Math.floor(timerState.currentTime / 60)
      .toString()
      .padStart(2, '0')
    const seconds = (timerState.currentTime % 60).toString().padStart(2, '0')
    return `${minutes}:${seconds}`
  }, [timerState.currentTime])

  const updateProgressBar = useCallback((): number => {
    let totalTime: number
    let elapsedTime: number

    if (timerState.isBetweenCircuitsRest) {
      totalTime = timerState.betweenCircuitsRestTime
      elapsedTime = totalTime - timerState.currentTime
    } else if (timerState.isWorkout) {
      totalTime = timerState.workoutTime
      elapsedTime = totalTime - timerState.currentTime
    } else {
      totalTime = timerState.restTime
      elapsedTime = totalTime - timerState.currentTime
    }

    return (elapsedTime / totalTime) * 100
  }, [timerState])

  const startTimer = useCallback((): void => {
    setShowCountdown(true)
    setCountdownNumber(3)
    setIsInitialCountdownFinished(false)
  }, [])

  // Countdown logic
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined
    if (showCountdown) {
      const playCountdown = (): void => {
        if (countdownAudioRef.current) {
          countdownAudioRef.current.currentTime = 0
          countdownAudioRef.current
            .play()
            .catch((error) => console.error('Error playing countdown:', error))
        }
      }

      playCountdown() // Play sound immediately when countdown starts

      interval = setInterval(() => {
        setCountdownNumber((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            setShowCountdown(false)
            playInitialFightBell()
            return prev
          }
          playCountdown() // Play sound for the next number
          return prev - 1
        })
      }, 1000)
    }

    return (): void => {
      if (interval) clearInterval(interval)
      if (countdownAudioRef.current) {
        countdownAudioRef.current.pause()
        countdownAudioRef.current.currentTime = 0
      }
    }
  }, [showCountdown, playInitialFightBell])

  // Main timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined
    if (timerState.isRunning && !isPaused && isInitialCountdownFinished) {
      interval = setInterval(() => {
        setTimerState((prev) => {
          const newState = { ...prev }
          newState.currentTime--

          // Play countdown sound for last 3 seconds of rest
          if (
            (!newState.isWorkout || newState.isBetweenCircuitsRest) &&
            newState.currentTime === 3 &&
            !hasPlayedCountdownRef.current
          ) {
            playSound('countdown')
            hasPlayedCountdownRef.current = true
          }
          if (newState.currentTime < 0) {
            hasPlayedCountdownRef.current = false
            if (newState.isBetweenCircuitsRest) {
              newState.isBetweenCircuitsRest = false
              newState.isWorkout = true
              newState.currentTime = newState.workoutTime
              newState.currentRound = 1
              newState.currentCircuit++
              playSound('fightBell')
            } else if (newState.isWorkout) {
              newState.currentRound++
              if (newState.currentRound > newState.totalRounds) {
                if (newState.currentCircuit >= newState.totalCircuits) {
                  clearInterval(interval)
                  newState.isRunning = false
                  playSound('celebration')
                  return newState
                } else {
                  newState.isBetweenCircuitsRest = true
                  newState.currentTime = newState.betweenCircuitsRestTime
                  playSound('buzzer')
                  return newState
                }
              }
              newState.isWorkout = false
              newState.currentTime = newState.restTime
              playSound('whistle')
            } else {
              newState.isWorkout = true
              newState.currentTime = newState.workoutTime
              playSound('fightBell')
            }
          }

          return newState
        })
      }, 1000)
    }
    return (): void => {
      if (interval) clearInterval(interval)
    }
  }, [timerState.isRunning, isPaused, isInitialCountdownFinished, playSound])
  const resetTimer = useCallback((): void => {
    setTimerState((prev) => ({
      ...prev,
      currentTime: prev.workoutTime,
      currentRound: 0,
      currentCircuit: 1,
      isWorkout: true,
      isBetweenRoundsRest: false,
      isRunning: false
    }))
    setIsPaused(false)
    setIsInitialCountdownFinished(false)
  }, [])

  const updateTotalWorkoutTime = useCallback(() => {
    const totalSeconds =
      timerState.totalCircuits *
      (timerState.totalRounds * (timerState.workoutTime + timerState.restTime) +
        (timerState.totalRounds - 1) * timerState.betweenCircuitsRestTime)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    setTotalWorkoutTime(`${minutes}:${seconds.toString().padStart(2, '0')}`)
  }, [
    timerState.totalCircuits,
    timerState.totalRounds,
    timerState.workoutTime,
    timerState.restTime,
    timerState.betweenCircuitsRestTime
  ])

  useEffect(() => {
    updateTotalWorkoutTime()
  }, [
    timerState.totalCircuits,
    timerState.totalRounds,
    timerState.workoutTime,
    timerState.restTime,
    timerState.betweenCircuitsRestTime,
    updateTotalWorkoutTime
  ])

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
        <Content style={{ padding: '24px', background: '#fff' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Card
              style={{ textAlign: 'center', marginBottom: '20px' }}
              bodyStyle={{ padding: '40px' }}
            >
              <Title
                style={{
                  fontSize: '180px',
                  lineHeight: '1',
                  marginBottom: '20px',
                  color: timerState.isBetweenCircuitsRest
                    ? '#CE2D4F'
                    : timerState.isWorkout
                      ? '#275DAD'
                      : '#FC5130'
                }}
              >
                {updateTimerDisplay()}
              </Title>
              <Text strong style={{ fontSize: '28px', display: 'block', marginBottom: '20px' }}>
                Circuit: {timerState.currentCircuit}/{timerState.totalCircuits} | Round:{' '}
                {timerState.currentRound}/{timerState.totalRounds}
              </Text>
              <Progress
                percent={updateProgressBar()}
                showInfo={false}
                style={{ marginBottom: '30px' }}
                strokeColor={
                  timerState.isBetweenCircuitsRest
                    ? '#CE2D4F'
                    : timerState.isWorkout
                      ? '#275DAD'
                      : '#FC5130'
                }
                strokeWidth={15}
              />
              <Button.Group size="large">
                {!timerState.isRunning && !isPaused && (
                  <Button type="primary" icon={<PlayCircleOutlined />} onClick={startTimer}>
                    Start
                  </Button>
                )}
                {timerState.isRunning && !isPaused && (
                  <Button
                    type="primary"
                    icon={<PauseCircleOutlined />}
                    onClick={togglePause}
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
                    style={{ background: '#FC5130', borderColor: '#FC5130' }}
                  >
                    Resume
                  </Button>
                )}
                <Button icon={<ReloadOutlined />} onClick={resetTimer}>
                  Reset
                </Button>
              </Button.Group>
            </Card>
            <Collapse>
              <Panel header="Timer Settings" key="1" extra={<SettingOutlined />}>
                <div style={{ marginBottom: '10px' }}>
                  <Text strong>Circuits:</Text>
                  <InputNumber
                    min={1}
                    max={10}
                    value={timerState.totalCircuits}
                    onChange={(value) => handleSettingChange('totalCircuits', value as number)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <Text strong>Rounds per Circuit:</Text>
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
                <div style={{ marginBottom: '10px' }}>
                  <Text strong>Between Circuits Rest (seconds):</Text>
                  <InputNumber
                    min={1}
                    max={300}
                    value={timerState.betweenCircuitsRestTime}
                    onChange={(value) =>
                      handleSettingChange('betweenCircuitsRestTime', value as number)
                    }
                    style={{ width: '100%' }}
                  />
                </div>
              </Panel>
            </Collapse>
            <Card title="Workout Summary" style={{ marginTop: '20px' }}>
              <Text strong>Total Workout Time: {totalWorkoutTime}</Text>
              <br />
              <Text strong>
                Time On: <span style={{ color: '#52c41a' }}>{timerState.workoutTime} seconds</span>{' '}
                | Time Off: <span style={{ color: '#FC5130' }}>{timerState.restTime} seconds</span>{' '}
                | Between Circuits:{' '}
                <span style={{ color: '#1890ff' }}>
                  {timerState.betweenCircuitsRestTime} seconds
                </span>
              </Text>
            </Card>
          </div>
        </Content>
      </Layout>
      <Modal title="Countdown" open={showCountdown} footer={null} closable={false} centered>
        <Title style={{ textAlign: 'center', color: '#1890ff', fontSize: '120px' }}>
          {countdownNumber}
        </Title>
      </Modal>
    </ConfigProvider>
  )
}

export default App
