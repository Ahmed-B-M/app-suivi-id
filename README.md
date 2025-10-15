# Urbantz Data Exporter

This is a Next.js application that allows you to fetch, filter, and export data from the Urbantz API.

## Core Features

- **API Data Retrieval**: Configure and fetch task data from the Urbantz API.
- **Data Filtering**: Filter tasks based on date range and hub IDs.
- **JSON Export**: Save the retrieved and filtered task data into a `donnees_urbantz_tasks_filtrees.json` file.
- **Automated Scheduling**: A tool using generative AI to determine the best schedule for API calls and JSON export, considering potential rate limits and server load.
- **Process Logging**: View real-time logs of the export process.

## Getting Started

The main interface is located at `src/app/page.tsx`. From there, you can:

1.  Enter your Urbantz API key and filter parameters in the **Export Configuration** form.
2.  Click **Start Export** to begin fetching data.
3.  Monitor the progress in the **Logs** panel.
4.  Once complete, a **Download JSON** button will appear to save your data.
5.  Use the **Automated Scheduling** tool to get AI-powered recommendations for your data retrieval strategy.
