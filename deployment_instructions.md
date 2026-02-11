To deploy your project (both frontend and API) to Vercel, please follow these steps:

1.  **Commit the Vercel configuration change:**
    Navigate to your project directory in your terminal and run:
    ```bash
    git add vercel.json
    git commit -m "feat: Configure Vercel for frontend and API deployment"
    ```

2.  **Push your changes to GitHub:**
    ```bash
    git push origin main # Or your relevant branch, e.g., 'master'
    ```

3.  **Deploy on Vercel:**
    *   **If you have already connected your GitHub repository to Vercel:** Vercel should automatically detect the new commit and trigger a fresh deployment. You can monitor the deployment status on your Vercel dashboard.
    *   **If you haven't connected your GitHub repository to Vercel yet:**
        1.  Go to your Vercel dashboard (`vercel.com`).
        2.  Click "Add New..." and then "Project".
        3.  Select "Import Git Repository" and choose your `ddkcivil/roadpro` repository.
        4.  During the configuration, Vercel should automatically detect that it's a Vite project with an API. Ensure the "Build & Development Settings" are correctly identified (Build Command: `npm run build`, Output Directory: `dist`).
        5.  Click "Deploy".

Your project, with both the frontend and API, should now be deploying to Vercel.