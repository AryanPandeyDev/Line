import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"

// Types matching API response
export interface Task {
    id: string
    slug: string
    name: string
    description: string
    type: "DAILY" | "EXTERNAL" | "ACHIEVEMENT" | "ONBOARDING"
    icon: string | null
    reward: number
    xpReward: number
    externalUrl: string | null
    status: "ACTIVE" | "COMPLETED" | "CLAIMED" | "EXPIRED"
    progress: number
    targetProgress: number
}

interface TasksSummary {
    total: number
    completed: number
    claimedToday: number
}

interface StreakReward {
    day: number
    reward: number
    claimed: boolean
}

interface StreakData {
    current: number
    rewards: StreakReward[]
}

interface TasksState {
    tasks: Task[]
    summary: TasksSummary
    streak: StreakData
    isLoading: boolean
    error: string | null
}

const initialState: TasksState = {
    tasks: [],
    summary: { total: 0, completed: 0, claimedToday: 0 },
    streak: { current: 0, rewards: [] },
    isLoading: false,
    error: null,
}

// Async thunk to fetch tasks from API
export const fetchTasks = createAsyncThunk(
    "tasks/fetchTasks",
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch("/api/tasks")
            if (!response.ok) {
                throw new Error("Failed to fetch tasks")
            }
            return await response.json()
        } catch (error) {
            return rejectWithValue((error as Error).message)
        }
    }
)

// Async thunk to complete a task
export const completeTaskAsync = createAsyncThunk(
    "tasks/completeTask",
    async (taskId: string, { rejectWithValue }) => {
        try {
            const response = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taskId, action: "complete" }),
            })
            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || "Failed to complete task")
            }
            return await response.json()
        } catch (error) {
            return rejectWithValue((error as Error).message)
        }
    }
)

// Async thunk to claim task reward
export const claimTaskRewardAsync = createAsyncThunk(
    "tasks/claimTaskReward",
    async (taskId: string, { rejectWithValue }) => {
        try {
            const response = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taskId, action: "claim" }),
            })
            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || "Failed to claim task reward")
            }
            return await response.json()
        } catch (error) {
            return rejectWithValue((error as Error).message)
        }
    }
)

const tasksSlice = createSlice({
    name: "tasks",
    initialState,
    reducers: {
        clearTasksError: (state) => {
            state.error = null
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch tasks
            .addCase(fetchTasks.pending, (state) => {
                state.isLoading = true
                state.error = null
            })
            .addCase(fetchTasks.fulfilled, (state, action) => {
                state.isLoading = false
                state.tasks = action.payload.tasks
                state.summary = action.payload.summary
                state.streak = action.payload.streak
            })
            .addCase(fetchTasks.rejected, (state, action) => {
                state.isLoading = false
                state.error = action.payload as string
            })
            // Complete task
            .addCase(completeTaskAsync.fulfilled, (state, action) => {
                const taskId = action.payload.taskId
                const task = state.tasks.find((t) => t.id === taskId)
                if (task) {
                    task.status = "COMPLETED"
                    task.progress = task.targetProgress
                    state.summary.completed += 1
                }
            })
            // Claim task reward
            .addCase(claimTaskRewardAsync.fulfilled, (state, action) => {
                const taskId = action.payload.taskId
                const task = state.tasks.find((t) => t.id === taskId)
                if (task) {
                    task.status = "CLAIMED"
                    state.summary.claimedToday += 1
                }
            })
            .addCase(claimTaskRewardAsync.rejected, (state, action) => {
                state.error = action.payload as string
            })
    },
})

export const { clearTasksError } = tasksSlice.actions
export default tasksSlice.reducer

// Selectors
export const selectTasks = (state: { tasks: TasksState }) => state.tasks.tasks
export const selectTasksSummary = (state: { tasks: TasksState }) => state.tasks.summary
export const selectStreak = (state: { tasks: TasksState }) => state.tasks.streak
export const selectTasksLoading = (state: { tasks: TasksState }) => state.tasks.isLoading
export const selectTasksError = (state: { tasks: TasksState }) => state.tasks.error

// Selector for tasks by type
export const selectTasksByType = (type: Task["type"]) => (state: { tasks: TasksState }) =>
    state.tasks.tasks.filter((t) => t.type === type)
