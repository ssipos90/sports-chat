# Sports Chat

The core concept of this app is to create live channels around sports events.
Whenever there's a live sports event, the app will create said channels when the
event is published and the channels will go live at that time. Users can join
channels ahead of time and they can discuss around those events. The app will
push live notifications in the chat.

> The aim of this project is to learn websockets, microservices and event
> stores, as well as distributed systems (perhaps).

## TODO

See [TODO.md](TODO.md).

## General architecture

### Diagram

     ┌───────────────────────┐
    ┌───────────────────────┐│
    │Sports events providers│┘
    └───────────────────────┘
       │ external APIs (http, ws)
       │
    ---│-----------------------------------
       │
       │ live events
       │ from matches
       │
       ▼
    ┌────────────────┐   create rooms   ┌────────────┐
    │Event processors│─────────────────►│Chat service│
    └────────────────┘  publish events  └────────────┘

### Components

Event processors, chat service, user service and maybe an sports event
scheduling service.

#### Event processors

These will listen to external data sources for live event information. This
provides a way of learning high volume data processing (hopefully).

#### Chat service

This will handle all websocket chats in our app, along with chat clients.
