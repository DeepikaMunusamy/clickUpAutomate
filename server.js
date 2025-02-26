require("dotenv").config();
const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const CLICKUP_API_KEY = process.env.CLICKUP_API_TOKEN; // Replace with your ClickUp API key

// GitHub Webhook Endpoint
app.post("/github-webhook", async (req, res) => {
  const event = req.headers["x-github-event"];
  const payload = req.body;

  console.log(`Received GitHub event: ${event}`);

  // Handle Pull Request Events
  if (event === "pull_request") {
    const action = payload.action;
    const pr = payload.pull_request;

    // Extract ClickUp Task ID from PR description
    const taskId = extractClickUpTaskId(pr.body);
    if (!taskId) {
      console.log("No ClickUp Task ID found in PR description.");
      return res.status(200).send("No Task ID found.");
    }

    if (action === "closed" && pr.merged) {
      // Update ClickUp task status to "Done" when PR is merged
      try {
        await updateClickUpTaskStatus(taskId, "Done");
        console.log(`ClickUp task ${taskId} status updated to Done.`);
      } catch (error) {
        console.error("Error updating ClickUp task:", {
          message: error.message,
          response: error.response?.data,
          stack: error.stack,
        });
      }
    } else if (action === "opened") {
      // Update ClickUp task status to "In Progress" when PR is opened
      try {
        await updateClickUpTaskStatus(taskId, "In Progress");
        console.log(`ClickUp task ${taskId} status updated to In Progress.`);
      } catch (error) {
        console.error("Error updating ClickUp task:", {
          message: error.message,
          response: error.response?.data,
          stack: error.stack,
        });
      }
    }
  }

  // Handle Push Events (commits)
  if (event === "push") {
    const commits = payload.commits;
    for (const commit of commits) {
      // Extract ClickUp Task ID from commit message
      const taskId = extractClickUpTaskId(commit.message);
      if (!taskId) {
        console.log("No ClickUp Task ID found in commit message.");
        continue;
      }

      // Add a comment to the ClickUp task with commit details
      try {
        await addCommentToClickUpTask(taskId, `New commit: ${commit.message}`);
        console.log(`Commit details added to ClickUp task ${taskId}.`);
      } catch (error) {
        console.error("Error adding comment to ClickUp task:", {
          message: error.message,
          response: error.response?.data,
          stack: error.stack,
        });
      }
    }
  }

  res.status(200).send("Webhook received");
});

// Function to extract ClickUp Task ID from a string
function extractClickUpTaskId(text) {
  const regex = /https:\/\/app\.clickup\.com\/t\/([a-zA-Z0-9]+)/; // Matches task URLs
  const match = text.match(regex);
  return match ? match[1] : null; // Returns the Task ID (e.g., "86cy3tuar")
}

// Function to update ClickUp task status
async function updateClickUpTaskStatus(taskId, status) {
  try {
    console.log("Using API Key:", CLICKUP_API_KEY); // Debug log
    console.log("Updating ClickUp task:", taskId); // Debug log
    const response = await axios.put(
      `https://api.clickup.com/api/v2/task/${taskId}`,
      { status },
      { headers: { Authorization: CLICKUP_API_KEY } }
    );
    console.log("Task status updated:", response.data);
  } catch (error) {
    console.error("Error updating ClickUp task:", {
      message: error.message,
      response: error.response?.data,
      stack: error.stack,
    });
  }
}

// Function to add a comment to a ClickUp task
async function addCommentToClickUpTask(taskId, comment) {
  try {
    console.log("Using API Key:", CLICKUP_API_KEY); // Debug log
    console.log("Adding comment to ClickUp task:", taskId); // Debug log
    const response = await axios.post(
      `https://api.clickup.com/api/v2/task/${taskId}/comment`,
      { comment_text: comment },
      { headers: { Authorization: CLICKUP_API_KEY } }
    );
    console.log("Comment added:", response.data);
  } catch (error) {
    console.error("Error adding comment to ClickUp task:", {
      message: error.message,
      response: error.response?.data,
      stack: error.stack,
    });
  }
}

// Start the server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
