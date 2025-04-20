# ledgerly
Overengineered budgeting software

## Quickstart Guide

### Prerequisites
- Node.js (v18 or higher)
- Python (v3.8 or higher)
- PostgreSQL (v17)
- Make (for Windows, you can use Chocolatey to install it)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ledgerly.git
cd ledgerly
```

2. Install dependencies:
```bash
make install
```

### Running the Application

1. Start all services (Node.js app, Python watcher, and PostgreSQL):
```bash
make start
```

Or start individual components:

- Start Node.js application:
```bash
make start-node
```

- Start Python watcher:
```bash
make start-python
```

- Start PostgreSQL database:
```bash
make start-db
```

### Database Management

- Connect to PostgreSQL:
```bash
make connect-db
```

- Stop PostgreSQL:
```bash
make stop-db
```

### Stopping the Application

To stop all running processes:
```bash
make stop
```

## Project Structure
- `node_app/` - Frontend and API server
- `python_app/` - Background services and data processing
- `postgresql/` - Database configuration and migrations
- `public/` - Static assets

## License
See [LICENSE](LICENSE) for details.
