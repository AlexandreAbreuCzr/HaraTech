# Hara Tech - AI Context

## Project Overview

Hara Tech is an IoT platform focused on monitoring, automation and remote control of physical devices using ESP32 microcontrollers and a centralized API.

The first implemented module is a smart irrigation system, but the architecture must remain generic and extensible to support future automation scenarios.

The project consists of:

* ESP32 firmware (Arduino Framework).
* Backend API (Node.js + TypeScript).
* Database managed through Prisma ORM.
* Future web dashboard for monitoring and management.

The architecture must always prioritize scalability, maintainability, extensibility and clean code practices.

---

# Main Goals

The current goal is to automate irrigation processes and allow remote monitoring and control.

The platform should be capable of:

* Registering devices.
* Managing irrigation zones.
* Receiving telemetry data.
* Storing historical records.
* Managing configurations remotely.
* Sending commands to devices.
* Monitoring device status.
* Supporting multiple actuator types.
* Supporting future expansion without major architectural changes.

Although irrigation is the first use case, the platform should be designed as a generic IoT system.

---

# Repository Structure

## Firmware

Location:

```text
esp32codes/
```

Current entry point:

```text
esp32codes/initial.ino
```

Responsibilities:

* Connect to Wi-Fi.
* Authenticate with API.
* Read sensors.
* Send telemetry.
* Receive configurations.
* Execute commands.
* Control actuators.
* Display information on LCD.

The firmware should avoid hardcoded values whenever possible.

Configuration should come from the API whenever feasible.

---

## Backend

Location:

```text
hara-tech-api/
```

Technology stack:

* Node.js
* TypeScript
* Express
* Prisma ORM

Architecture:

```text
Routes
  ↓
Controllers
  ↓
Services
  ↓
Prisma
  ↓
Database
```

Responsibilities:

* Authentication.
* Device management.
* Zone management.
* Configuration management.
* Telemetry ingestion.
* Command dispatching.
* Historical storage.
* Business rules.

---

# Backend Layers

## Routes

Location:

```text
src/routes
```

Responsibilities:

* Define REST endpoints.
* Delegate requests to controllers.

Examples:

```text
/auth
/devices
/zones
/telemetry
```

---

## Controllers

Location:

```text
src/controllers
```

Responsibilities:

* Receive requests.
* Validate basic inputs.
* Call services.
* Return responses.

Controllers should remain thin.

Business logic belongs in services.

---

## Services

Location:

```text
src/services
```

Responsibilities:

* Business rules.
* Validation.
* Data processing.
* Decision making.

Examples:

* Device registration.
* Zone configuration.
* Telemetry processing.
* Actuator command generation.

---

## Prisma

Location:

```text
prisma/
```

Responsibilities:

* Database schema.
* Migrations.
* Persistence layer.

Prisma models are the source of truth for the system's data structure.

Always analyze existing models before introducing new entities.

---

## Middlewares

Location:

```text
src/middlewares
```

Responsibilities:

* User authentication.
* Device authentication.
* Error handling.
* Request validation.

---

## Utilities

Location:

```text
src/utils
```

Responsibilities:

* Shared helper functions.
* JWT utilities.
* Device authentication helpers.
* Error classes.
* ID generation.

---

# Core Concepts

## Device

Represents a physical ESP32 device.

Examples:

* Irrigation controller.
* Greenhouse controller.
* Future IoT controllers.

Typical properties:

* id
* name
* firmwareVersion
* status
* lastSeen

A device may manage multiple zones.

Never assume a single device controls only one zone.

---

## Zone

Represents an independent irrigation area.

Examples:

* Tomatoes
* Lettuce
* Garden
* Greenhouse Sector A

Each zone contains:

* Unique identifier.
* Name.
* Configuration.
* Associated actuator.
* Sensor data.

Important:

Never hardcode zone quantities.

The system must support:

* 1 zone
* 2 zones
* 10 zones
* 100+ zones

without architectural changes.

---

## Actuator

Represents any hardware capable of performing an action.

Current examples:

* Relay
* Servo

Future examples:

* Valve
* Pump controller
* PWM controller

Always model actuators generically.

Never create logic tied to specific actuator names.

Prefer:

```text
actuator.type
```

Instead of:

```text
servo1
relay2
pump3
```

---

## Telemetry

Represents data received from devices.

Examples:

* Soil moisture.
* Temperature.
* Humidity.
* Water tank level.

Telemetry should be stored historically.

Historical data must never overwrite previous records.

---

## Commands

Represents instructions sent to devices.

Examples:

* Activate actuator.
* Stop actuator.
* Synchronize configuration.
* Restart device.

Commands should be tracked and auditable.

---

## Configuration

Represents remotely managed settings.

Examples:

* Moisture threshold.
* Irrigation duration.
* Reading interval.
* Actuator parameters.

Configurations should be dynamic.

Avoid firmware recompilation for simple configuration changes.

---

# Communication Flow

Typical flow:

```text
ESP32
 ↓
API
 ↓
Database
 ↓
Dashboard
```

Device startup flow:

```text
Boot
 ↓
Connect Wi-Fi
 ↓
Authenticate
 ↓
Download configuration
 ↓
Start telemetry cycle
 ↓
Check pending commands
 ↓
Execute commands
 ↓
Report results
```

---

# Authentication

The system supports two authentication layers.

## User Authentication

Used by administrators and dashboard users.

Current implementation:

* JWT

Responsibilities:

* Login
* Protected routes
* Authorization

---

## Device Authentication

Used by ESP32 devices.

Responsibilities:

* Device registration
* Device identification
* Secure API access

Devices should never send data anonymously.

---

# Database Principles

The database must support:

* Multiple devices.
* Multiple zones.
* Multiple actuators.
* Historical telemetry.
* Historical events.
* Future expansion.

Never design database structures assuming fixed quantities.

---

# Coding Rules

## Hardcoded Values

Avoid:

* Fixed zone IDs.
* Fixed actuator IDs.
* Fixed URLs.
* Fixed configuration values.

Prefer configuration-driven approaches.

---

## Scalability

Every solution must support future growth.

Before implementing:

Ask:

"Will this still work with 100 devices and 500 zones?"

---

## Maintainability

Prioritize:

* Readability.
* Separation of concerns.
* Reusable code.
* Clear naming.

---

## REST API Standards

Use proper HTTP methods.

Examples:

```http
GET
POST
PUT
PATCH
DELETE
```

Use appropriate status codes.

Examples:

```http
200 OK
201 Created
400 Bad Request
401 Unauthorized
404 Not Found
500 Internal Server Error
```

---

## Naming Conventions

Use English names only.

Examples:

Good:

```text
device
zone
actuator
telemetry
configuration
```

Avoid:

```text
dispositivo
zona
atuador
configuracao
```

---

# Future Vision

The project should be prepared to support:

* Smart irrigation.
* Greenhouse automation.
* Environmental monitoring.
* Water tank monitoring.
* Climate control.
* Lighting control.
* Agricultural automation.
* Residential automation.
* Mobile applications.
* Real-time dashboards.
* Analytics and reports.

All new implementations should respect the existing architecture and remain compatible with future expansion.

---

# Instructions For AI Assistants

Before suggesting changes:

1. Analyze the existing architecture.
2. Analyze current Prisma models.
3. Reuse existing patterns.
4. Avoid breaking compatibility.
5. Explain the impact of changes.
6. Prefer scalable solutions.
7. Avoid introducing hardcoded assumptions.
8. Follow the Routes → Controllers → Services → Prisma architecture.
9. Keep controllers thin.
10. Place business logic inside services.
11. Preserve TypeScript typing whenever possible.
12. Maintain backward compatibility with existing firmware and API endpoints.
