# Mobile Handoff - Sage Flutter App

This directory contains the Flutter mobile application for Sage.

## Prerequisites
- Flutter SDK (latest stable)
- Android Studio / VS Code with Flutter extension
- An Android emulator or a real device with USB debugging enabled

## Setup
1.  **Dependencies**:
    Run the following command in the `/mobile` directory:
    ```bash
    flutter pub get
    ```

2.  **Configuration**:
    The app requires a `assets/config.json` file. A template has been created at `assets/config.json`.
    Fill it with your Supabase and Gemini credentials:
    ```json
    {
      "supabase_url": "YOUR_SUPABASE_URL",
      "supabase_anon_key": "YOUR_SUPABASE_ANON_KEY",
      "gemini_api_key": "YOUR_GEMINI_API_KEY"
    }
    ```

3.  **Supabase RLS**:
    Ensure the `expenses` table has RLS enabled and policies allow authenticated users to:
    - `SELECT` their own expenses (`auth.uid() = user_id`)
    - `INSERT` their own expenses
    - `UPDATE` their own expenses
    - `DELETE` their own expenses

## Running the App
- To run on an emulator or connected device:
  ```bash
  flutter run
  ```

## Building the APK
- To build a debug APK:
  ```bash
  flutter build apk --debug
  ```
  The APK will be located at `build/app/outputs/flutter-apk/app-debug.apk`.

## Features Implemented
- **Auth**: Login and Registration via Supabase.
- **Dashboard**: Monthly total spending and category breakdown (PieChart).
- **Add Expense**: AI-powered auto-categorisation based on the expense note.
- **History**: Full list with category/month filters and swipe-to-delete (with undo).
- **AI Chat**: "Ask" about your spending or "Edit" expenses naturally using Gemini.
