#!/usr/bin/env python3
"""
FAF File Tools - Python Package Setup
High-performance file operations for Python applications
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read README for long description
readme_path = Path(__file__).parent / "README.md"
long_description = ""
if readme_path.exists():
    with open(readme_path, encoding="utf-8") as f:
        long_description = f.read()

# Read requirements
requirements_path = Path(__file__).parent / "requirements.txt"
requirements = []
if requirements_path.exists():
    with open(requirements_path, encoding="utf-8") as f:
        requirements = [line.strip() for line in f 
                       if line.strip() and not line.startswith("#")]

setup(
    name="faf-file-tools",
    version="2.0.0",
    author="FAF Development Team",
    author_email="hello@faf.dev",
    description="🏎️ High-performance file operations for Python - Built for speed, designed for excellence",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/faf-dev/claude-faf-mcp",
    project_urls={
        "Bug Tracker": "https://github.com/faf-dev/claude-faf-mcp/issues",
        "Documentation": "https://faf.dev/docs",
        "Source Code": "https://github.com/faf-dev/claude-faf-mcp",
    },
    
    # Package configuration
    packages=find_packages(exclude=["tests*", "benchmarks*", "docs*"]),
    include_package_data=True,
    package_data={
        "faf_file_tools": ["*.json", "*.yaml", "*.md"],
    },
    
    # Python version requirement
    python_requires=">=3.8",
    
    # Dependencies
    install_requires=[
        "fastapi>=0.104.0",
        "uvicorn>=0.24.0",
        "pydantic>=2.5.0",
        "aiofiles>=23.2.0",
        "pandas>=2.1.0",
        "numpy>=1.26.0",
    ],
    
    # Optional dependencies
    extras_require={
        "dev": [
            "pytest>=7.4.0",
            "pytest-asyncio>=0.21.0",
            "pytest-cov>=4.1.0",
            "black>=23.11.0",
            "flake8>=6.1.0",
            "mypy>=1.7.0",
            "pylint>=3.0.0",
            "isort>=5.12.0",
        ],
        "benchmark": [
            "memory-profiler>=0.61.0",
            "line-profiler>=4.1.0",
        ],
        "redis": [
            "redis>=5.0.0",
            "hiredis>=2.2.0",
        ],
        "celery": [
            "celery>=5.3.0",
            "flower>=2.0.0",
        ],
        "monitoring": [
            "prometheus-client>=0.19.0",
        ],
    },
    
    # Entry points for CLI commands
    entry_points={
        "console_scripts": [
            "faf-api=faf_api_server:main",
            "faf-analyze=faf_data_analyzer:main",
            "faf-bridge=faf_file_tools:main",
        ],
    },
    
    # Classifiers for PyPI
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: System :: Filesystems",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Operating System :: OS Independent",
        "Framework :: FastAPI",
        "Environment :: Console",
        "Environment :: Web Environment",
    ],
    
    # Keywords for discovery
    keywords=[
        "faf",
        "file-operations",
        "file-tools",
        "fastapi",
        "high-performance",
        "claude",
        "mcp",
        "ai-tools",
        "data-processing",
        "file-management",
    ],
    
    # Test suite
    test_suite="tests",
    tests_require=[
        "pytest>=7.4.0",
        "pytest-asyncio>=0.21.0",
        "pytest-cov>=4.1.0",
    ],
    
    # Zip safe
    zip_safe=False,
)

# Custom installation message
print("\n" + "=" * 60)
print("🏎️ FAF File Tools - Python Installation")
print("=" * 60)
print("\nThank you for installing FAF File Tools!")
print("\nQuick Start:")
print("  1. Import: from faf_file_tools import FAFPythonBridge")
print("  2. API Server: faf-api")
print("  3. Data Analysis: faf-analyze")
print("  4. Documentation: https://faf.dev/docs")
print("\n🏁 Built for speed. Designed for excellence.")
print("=" * 60 + "\n")
