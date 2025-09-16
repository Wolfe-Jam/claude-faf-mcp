#!/usr/bin/env python3
"""
FAF File Tools - Comprehensive Test Suite
Tests all Python functionality with pytest
"""

import pytest
import asyncio
import json
import os
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
import pandas as pd
import numpy as np
from unittest.mock import Mock, patch, AsyncMock
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import modules to test
from faf_file_tools import FAFPythonBridge, FileOperation
from faf_data_analyzer import FAFDataAnalyzer


class TestFAFPythonBridge:
    """Test suite for FAF Python Bridge"""
    
    @pytest.fixture
    def temp_dir(self):
        """Create temporary directory for testing"""
        temp_path = tempfile.mkdtemp(prefix="faf_test_")
        yield Path(temp_path)
        shutil.rmtree(temp_path)
    
    @pytest.fixture
    def bridge(self, temp_dir):
        """Create FAF bridge instance"""
        return FAFPythonBridge(base_path=str(temp_dir))
    
    def test_initialization(self, bridge):
        """Test bridge initialization"""
        assert bridge is not None
        assert bridge.stats["files_read"] == 0
        assert bridge.stats["files_written"] == 0
        assert bridge.stats["bytes_processed"] == 0
        assert bridge.stats["errors"] == 0
    
    def test_read_json_config(self, bridge, temp_dir):
        """Test reading JSON configuration"""
        # Create test JSON file
        test_data = {"version": "2.0.0", "status": "active"}
        test_file = temp_dir / "test_config.json"
        with open(test_file, 'w') as f:
            json.dump(test_data, f)
        
        # Read using bridge
        result = bridge.read_json_config("test_config.json")
        
        assert result == test_data
        assert bridge.stats["files_read"] == 1
        assert bridge.stats["bytes_processed"] > 0
    
    def test_write_python_report(self, bridge, temp_dir):
        """Test writing Python report"""
        report_data = {
            "title": "Test Report",
            "version": "2.0.0",
            "metrics": {"speed": 100, "accuracy": 99.9}
        }
        
        result = bridge.write_python_report(report_data, "test_report.py")
        
        assert "Successfully wrote" in result
        assert bridge.stats["files_written"] == 1
        
        # Verify file exists and is valid Python
        report_file = temp_dir / "test_report.py"
        assert report_file.exists()
        
        # Try to compile the Python file
        with open(report_file, 'r') as f:
            code = f.read()
        compile(code, str(report_file), 'exec')
    
    def test_generate_test_suite(self, bridge, temp_dir):
        """Test generating test suite"""
        test_file = bridge.generate_test_suite()
        
        assert os.path.exists(test_file)
        assert bridge.stats["files_written"] == 1
        
        # Verify it's valid Python
        with open(test_file, 'r') as f:
            code = f.read()
        compile(code, test_file, 'exec')
    
    def test_calculate_file_hash(self, bridge, temp_dir):
        """Test file hash calculation"""
        test_file = temp_dir / "hash_test.txt"
        test_content = "Hello FAF!"
        test_file.write_text(test_content)
        
        hash_result = bridge.calculate_file_hash("hash_test.txt")
        
        assert len(hash_result) == 64  # SHA-256 hash length
        assert all(c in '0123456789abcdef' for c in hash_result)
    
    def test_get_statistics(self, bridge):
        """Test statistics retrieval"""
        stats = bridge.get_statistics()
        
        assert "stats" in stats
        assert "operations_count" in stats
        assert "total_bytes" in stats
        assert "success_rate" in stats
        assert stats["success_rate"] == 0  # No operations yet
    
    def test_operation_logging(self, bridge):
        """Test operation logging"""
        bridge._log_operation("read", "/test/file.txt", 1024, 35.5, True)
        
        assert len(bridge.operations) == 1
        op = bridge.operations[0]
        assert op.operation == "read"
        assert op.path == "/test/file.txt"
        assert op.size_bytes == 1024
        assert op.duration_ms == 35.5
        assert op.success is True
    
    def test_error_handling(self, bridge):
        """Test error handling for non-existent file"""
        with pytest.raises(Exception) as exc_info:
            bridge.read_json_config("non_existent.json")
        
        assert "Failed to read" in str(exc_info.value)
        assert bridge.stats["errors"] == 1


class TestFAFDataAnalyzer:
    """Test suite for FAF Data Analyzer"""
    
    @pytest.fixture
    def analyzer(self):
        """Create analyzer instance"""
        return FAFDataAnalyzer()
    
    def test_generate_sample_data(self, analyzer):
        """Test sample data generation"""
        df = analyzer.generate_sample_data(50)
        
        assert len(df) == 50
        assert 'timestamp' in df.columns
        assert 'operation' in df.columns
        assert 'file_type' in df.columns
        assert 'duration_ms' in df.columns
        assert 'size_bytes' in df.columns
        assert 'success' in df.columns
        assert 'path' in df.columns
        
        # Check data types
        assert pd.api.types.is_datetime64_any_dtype(df['timestamp'])
        assert pd.api.types.is_numeric_dtype(df['duration_ms'])
        assert pd.api.types.is_numeric_dtype(df['size_bytes'])
        assert pd.api.types.is_bool_dtype(df['success'])
    
    def test_analyze_performance(self, analyzer):
        """Test performance analysis"""
        df = analyzer.generate_sample_data(100)
        analysis = analyzer.analyze_performance(df)
        
        assert 'summary' in analysis
        assert 'performance' in analysis
        assert 'by_operation' in analysis
        assert 'by_file_type' in analysis
        
        # Check summary metrics
        summary = analysis['summary']
        assert summary['total_operations'] == 100
        assert 0 <= summary['success_rate'] <= 100
        
        # Check performance metrics
        perf = analysis['performance']
        assert 'avg_duration_ms' in perf
        assert 'median_duration_ms' in perf
        assert 'p95_duration_ms' in perf
        assert 'p99_duration_ms' in perf
        assert perf['avg_duration_ms'] > 0
    
    def test_generate_performance_report(self, analyzer):
        """Test report generation"""
        df = analyzer.generate_sample_data(50)
        analysis = analyzer.analyze_performance(df)
        report = analyzer.generate_performance_report(analysis)
        
        assert isinstance(report, str)
        assert "FAF FILE TOOLS - PERFORMANCE ANALYSIS REPORT" in report
        assert "SUMMARY" in report
        assert "PERFORMANCE METRICS" in report
        assert "Total Operations:" in report
    
    def test_export_metrics_csv(self, analyzer, tmp_path):
        """Test CSV export"""
        df = analyzer.generate_sample_data(25)
        csv_path = tmp_path / "test_metrics.csv"
        
        result = analyzer.export_metrics_csv(df, str(csv_path))
        
        assert f"Exported 25 records" in result
        assert csv_path.exists()
        
        # Read back and verify
        df_read = pd.read_csv(csv_path)
        assert len(df_read) == 25
        assert list(df_read.columns) == list(df.columns)
    
    def test_create_benchmark_suite(self, analyzer):
        """Test benchmark suite creation"""
        benchmark_code = analyzer.create_benchmark_suite()
        
        assert isinstance(benchmark_code, str)
        assert "FAF File Tools - Benchmark Suite" in benchmark_code
        assert "class FAFBenchmark:" in benchmark_code
        assert "def benchmark_read_operations" in benchmark_code
        
        # Verify it's valid Python
        compile(benchmark_code, '<string>', 'exec')


class TestFileOperation:
    """Test FileOperation dataclass"""
    
    def test_file_operation_creation(self):
        """Test creating FileOperation instance"""
        op = FileOperation(
            operation="read",
            path="/test/file.txt",
            size_bytes=1024,
            timestamp="2025-09-15T08:00:00",
            duration_ms=35.5,
            success=True
        )
        
        assert op.operation == "read"
        assert op.path == "/test/file.txt"
        assert op.size_bytes == 1024
        assert op.duration_ms == 35.5
        assert op.success is True
    
    def test_file_operation_to_dict(self):
        """Test converting FileOperation to dictionary"""
        op = FileOperation(
            operation="write",
            path="/output/report.md",
            size_bytes=2048,
            timestamp="2025-09-15T08:00:00",
            duration_ms=67.3,
            success=True
        )
        
        result = op.to_dict()
        
        assert isinstance(result, dict)
        assert result["operation"] == "write"
        assert result["path"] == "/output/report.md"
        assert result["size_bytes"] == 2048
        assert result["duration_ms"] == 67.3
        assert result["success"] is True


class TestIntegration:
    """Integration tests for FAF File Tools"""
    
    @pytest.fixture
    def setup_env(self):
        """Setup test environment"""
        temp_dir = tempfile.mkdtemp(prefix="faf_integration_")
        bridge = FAFPythonBridge(base_path=temp_dir)
        analyzer = FAFDataAnalyzer()
        
        yield {
            "temp_dir": Path(temp_dir),
            "bridge": bridge,
            "analyzer": analyzer
        }
        
        shutil.rmtree(temp_dir)
    
    def test_full_workflow(self, setup_env):
        """Test complete workflow: generate, analyze, report"""
        bridge = setup_env["bridge"]
        analyzer = setup_env["analyzer"]
        temp_dir = setup_env["temp_dir"]
        
        # Step 1: Generate sample data
        df = analyzer.generate_sample_data(100)
        
        # Step 2: Export to CSV
        csv_path = temp_dir / "metrics.csv"
        analyzer.export_metrics_csv(df, str(csv_path))
        
        # Step 3: Read CSV back
        assert csv_path.exists()
        df_read = pd.read_csv(csv_path)
        assert len(df_read) == 100
        
        # Step 4: Analyze performance
        analysis = analyzer.analyze_performance(df_read)
        
        # Step 5: Generate report
        report = analyzer.generate_performance_report(analysis)
        
        # Step 6: Write report using bridge
        result = bridge.write_python_report(
            {"analysis": "complete", "records": len(df)},
            "final_report.py"
        )
        
        assert "Successfully wrote" in result
        assert (temp_dir / "final_report.py").exists()
        
        # Verify statistics
        stats = bridge.get_statistics()
        assert stats["stats"]["files_written"] == 1
        assert stats["success_rate"] == 100
    
    def test_error_recovery(self, setup_env):
        """Test error handling and recovery"""
        bridge = setup_env["bridge"]
        
        # Try to read non-existent file
        with pytest.raises(Exception):
            bridge.read_json_config("does_not_exist.json")
        
        # Verify error was logged
        assert bridge.stats["errors"] == 1
        
        # Verify bridge still works after error
        test_data = {"test": "data"}
        result = bridge.write_python_report(test_data, "recovery_test.py")
        assert "Successfully wrote" in result


class TestPerformance:
    """Performance tests for FAF File Tools"""
    
    @pytest.fixture
    def large_dataset(self):
        """Generate large dataset for performance testing"""
        return pd.DataFrame({
            'id': range(10000),
            'value': np.random.randn(10000),
            'category': np.random.choice(['A', 'B', 'C', 'D'], 10000),
            'timestamp': pd.date_range('2025-01-01', periods=10000, freq='min')
        })
    
    def test_large_file_performance(self, tmp_path, large_dataset):
        """Test performance with large files"""
        import time
        
        # Write large CSV
        csv_path = tmp_path / "large_file.csv"
        
        start = time.time()
        large_dataset.to_csv(csv_path, index=False)
        write_duration = time.time() - start
        
        # Should complete within 5 seconds
        assert write_duration < 5.0
        
        # Read large CSV
        start = time.time()
        df_read = pd.read_csv(csv_path)
        read_duration = time.time() - start
        
        # Should complete within 2 seconds
        assert read_duration < 2.0
        assert len(df_read) == 10000
    
    def test_multiple_operations_performance(self, tmp_path):
        """Test performance of multiple operations"""
        import time
        
        bridge = FAFPythonBridge(base_path=str(tmp_path))
        
        start = time.time()
        
        # Perform 100 operations
        for i in range(100):
            data = {"iteration": i, "timestamp": datetime.now().isoformat()}
            bridge.write_python_report(data, f"report_{i}.py")
        
        duration = time.time() - start
        
        # Should complete 100 operations within 10 seconds
        assert duration < 10.0
        assert bridge.stats["files_written"] == 100
        
        # Calculate average operation time
        avg_time = duration / 100 * 1000  # Convert to ms
        assert avg_time < 100  # Should average under 100ms per operation


# Run tests with pytest
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
