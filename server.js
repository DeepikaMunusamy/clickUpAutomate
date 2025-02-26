require("dotenv").config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');


const port = process.env.PORT || 3000;
const clickUpToken = process.env.CLICKUP_API_TOKEN;
const clickUpListId = process.env.LIST_ID;


// Initialize Express app
const app = express();



// Use body-parser to parse incoming JSON data
app.use(bodyParser.json());



// GitHub webhook endpoint
app.post('/github-webhook', async (req, res) => {
  const payload = req.body;




  // 1. Automatically Create ClickUp Tasks from GitHub Issues
  if (payload.action === 'opened' && payload.issue) {
    const issueTitle = payload.issue.title;
    const issueBody = payload.issue.body;
    const issueUrl = payload.issue.html_url;
    const issueAuthor = payload.issue.user.login;

    try {
      // Create a task in ClickUp when an issue is opened
      await axios.post(
        `https://api.clickup.com/api/v2/list/${clickUpListId}/task`,
        {
          name: issueTitle,
          description: `Issue opened by ${issueAuthor}: ${issueUrl}\n\n${issueBody}`,
          assignees: [], // Assign based on your logic
          priority: 3, // Optional
          due_date: Date.now() + 7 * 24 * 60 * 60 * 1000 // Optional, 7 days from now
        },
        {
          headers: {
            Authorization: clickUpToken,
            'Content-Type': 'application/json'
          }
        }
      );

      res.status(200).send('Issue task created in ClickUp!');
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).send('Error creating task in ClickUp');
    }
  }





  // 2. Sync ClickUp Tasks with GitHub Pull Requests
  if (payload.action === 'opened' && payload.pull_request) {
    const prTitle = payload.pull_request.title;
    const prUrl = payload.pull_request.html_url;
    const prAuthor = payload.pull_request.user.login;

    try {
      // Create a task in ClickUp when a PR is opened
      await axios.post(
        `https://api.clickup.com/api/v2/list/${clickUpListId}/task`,
        {
          name: prTitle,
          description: `PRconst port = 3000; opened by ${prAuthor}: ${prUrl}`,
          assignees: [], // Assign based on your logic
          priority: 2, // Optional
          due_date: Date.now() + 7 * 24 * 60 * 60 * 1000 // Optional
        },
        {
          headers: {
            Authorization: clickUpToken,
            'Content-Type': 'application/json'
          }
        }
      );

      res.status(200).send('PR task created in ClickUp!');
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).send('Error creating task in ClickUp');
    }
  }






  // 3. Update ClickUp Task Status from GitHub Actions
  if (payload.action === 'closed' && payload.pull_request.merged) {
    const prTitle = payload.pull_request.title;
    const taskId = 'LINKED_CLICKUP_TASK_ID'; // Logic to find related task

    try {
      // Mark task as complete in ClickUp
      await axios.put(
        `https://api.clickup.com/api/v2/task/${taskId}`,
        {
          status: 'closed',
        },
        {
          headers: {
            Authorization: clickUpToken,
            'Content-Type': 'application/json'
          }
        }
      );

      res.status(200).send('Task closed successfully in ClickUp!');
    } catch (error) {
      console.error('Error closing task:', error);
      res.status(500).send('Error closing task in ClickUp');
    }
  }





  // 4. Link GitHub Commits to ClickUp Tasks
  if (payload.commits) {
    payload.commits.forEach(async (commit) => {
      const commitMessage = commit.message;
      const taskIdMatch = commitMessage.match(/CU-(\d+)/); // Look for CU-123 in the commit message
      if (taskIdMatch) {
        const taskId = taskIdMatch[0]; // e.g., CU-123

        try {
          // Update ClickUp task with commit details
          await axios.put(
            `https://api.clickup.com/api/v2/task/${taskId}`,
            {
              description: `Commit made: ${commitMessage}`,
            },
            {
              headers: {
                Authorization: clickUpToken,
                'Content-Type': 'application/json'
              }
            }
          );
        } catch (error) {
          console.error('Error updating task with commit:', error);
        }
      }
    });
  }




  res.status(200).send('Event processed');
});





// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
