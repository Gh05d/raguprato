# RAGUPRATO - Rad Guitar Practice Tool

#### Video Demo: [D.tube](https://d.tube/#!/v/gh05dan0n/QmQuhNVpDk9ArkyKsvA5nne3mq2PJKkaEQ8A6gCXaGSnUc)

## Description:

**RAGUPRATO** is a practice tool for playing guitar. It consists of personal lessons the user can create which have the following features:

- Youtube integration
- Free flow integration of chord sites like echords via an `Iframe`
- A stopwatch to track how long a track was played / practiced
- Chords can be saved
- Tabs can be created
- Strumming patterns can be created via Drag and Drop
- Personal notes can be saved
- Overview of open and finished lessons with the time dedicated for it
- Microphone integration for visual effects which represent the notes when playing
- Uses the built-in local storage of the browser so that users don't need any account

### Technologies which were used:

- Svelte
- node-sass
- Rollup
- Axios
- sirv

### Files contain the following:

#### App.svelte

The entry file for the application

#### global.css

Global styles

#### helpers.js

Some helper methods which are shared by several components

#### Lesson.svelte

The main meat of the application. Contains code to render a youtube videos, an `<Iframe />` for chords, a diagram for strumming patterns, a stopwatch and notes

#### LessonHeader.svelte

Header component containing the stopwatch for the Lesson component

#### Lessons.svelte

A list component which lists all lessons including a quick overview about which lessons are and how long was played

#### Navigation.svelte

The sticky header

#### NavItems.svelte

Items for the header

#### NewLesson.svelte

Basically a form where you can add a youtube video, an url for the chords as well as the title and the artist of the song

#### Stopwatch.svelte

A simple stopwatch

#### VideoSnippet.svelte

A graphic representation of the result of an api call to the youtube api

#### Visualizer.svelte

Uses the users microfon to visualize the chords played using the `Audio` interface of the browser

#### App is deployed via [Github Pages](https://gh05d.github.io/raguprato/index.html)

#### How to launch the Application

1. Clone the code: `git clone https://github.com/Gh05d/raguprato.git`
2. Run command prompt in the folder and `run npm install` to install all dependencies
3. Once installed run the command `npm run start`
4. In your browser go to [localhost:5000]
5. You are ready to go!
