require("dotenv").config();
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;
const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
const LIST_ID = process.env.LIST_ID;

app.use(bodyParser.json());

// Root endpoint
app.get("/", (req, res) => {
  res.send("Welcome to GitHub-ClickUp Integration");
});

// GitHub Webhook Handler
app.post("/webhook", async (req, res) => {
  const event = req.headers["x-github-event"];
  const payload = req.body;

  try {
    // 1. Automatically Create ClickUp Tasks from GitHub Issues
    if (event === "issues" && payload.action === "opened") {
      const { title, body, html_url: issueUrl, user } = payload.issue;
      const issueAuthor = user.login;

      await createClickUpTask({
        name: title,
        description: `Issue opened by ${issueAuthor}: ${issueUrl}\n\n${body}`,
        status: "to do",
        priority: 3, // Optional
        due_date: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
      });

      console.log("Issue task created in ClickUp!");
    }

    // 2. Sync ClickUp Tasks with GitHub Pull Requests
    if (event === "pull_request" && payload.action === "opened") {
      const { title, html_url: prUrl, user } = payload.pull_request;
      const prAuthor = user.login;

      await createClickUpTask({
        name: title,
        description: `PR opened by ${prAuthor}: ${prUrl}`,
        status: "to do",
        priority: 2, // Optional
        due_date: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
      });

      console.log("PR task created in ClickUp!");
    }

    // 3. Update ClickUp Task Status from GitHub Actions
    if (event === "pull_request" && payload.action === "closed" && payload.pull_request.merged) {
      const taskId = await findClickUpTaskId(payload.pull_request.title); // Logic to find related task
      if (taskId) {
        await updateClickUpTaskStatus(taskId, "closed");
        console.log("Task closed successfully in ClickUp!");
      }
    }

    // 4. Link GitHub Commits to ClickUp Tasks
    if (event === "push" && payload.commits) {
      for (const commit of payload.commits) {
        const commitMessage = commit.message;
        const taskIdMatch = commitMessage.match(/CU-(\d+)/); // Look for CU-123 in the commit message
        if (taskIdMatch) {
          const taskId = taskIdMatch[0]; // e.g., CU-123
          await updateClickUpTaskDescription(taskId, `Commit made: ${commitMessage}`);
          console.log(`Commit linked to ClickUp task ${taskId}`);
        }
      }
    }

    res.status(200).send("Event processed successfully");
  } catch (error) {
    console.error("Error processing webhook:", error.response?.data || error.message);
    res.status(500).send("Error processing webhook");
  }
});

// Helper function to create a ClickUp task
async function createClickUpTask(taskData) {
  await axios.post(
    `https://api.clickup.com/api/v2/list/${LIST_ID}/task`,
    taskData,
    {
      headers: {
        Authorization: CLICKUP_API_TOKEN,
        "Content-Type": "application/json",
      },
    }
  );
}

// Helper function to update ClickUp task status
async function updateClickUpTaskStatus(taskId, status) {
  await axios.put(
    `https://api.clickup.com/api/v2/task/${taskId}`,
    { status },
    {
      headers: {
        Authorization: CLICKUP_API_TOKEN,
        "Content-Type": "application/json",
      },
    }
  );
}

// Helper function to update ClickUp task description
async function updateClickUpTaskDescription(taskId, description) {
  await axios.put(
    `https://api.clickup.com/api/v2/task/${taskId}`,
    { description },
    {
      headers: {
        Authorization: CLICKUP_API_TOKEN,
        "Content-Type": "application/json",
      },
    }
  );
}

// Helper function to find ClickUp task ID (placeholder implementation)
async function findClickUpTaskId(taskName) {
  // Implement logic to find the task ID based on the task name
  // For now, return a placeholder or null
  return null;
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
