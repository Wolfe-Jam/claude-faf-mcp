#!/usr/bin/env python3
"""
FAF File Tools - Data Analysis Module
Demonstrates complex Python file operations with data processing
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Tuple, Optional
import json
import csv
from datetime import datetime, timedelta
import random
import os


class FAFDataAnalyzer:
    """Analyze file operations and performance metrics"""
    
    def __init__(self):
        self.performance_data = []
        self.file_metrics = {}
        
    def generate_sample_data(self, num_operations: int = 100) -> pd.DataFrame:
        """Generate sample performance data for testing"""
        
        operations = ['faf_read', 'faf_write', 'faf_init', 'faf_sync', 'faf_enhance']
        file_types = ['.py', '.ts', '.json', '.md', '.txt', '.yaml', '.html']
        
        data = []
        base_time = datetime.now() - timedelta(hours=24)
        
        for i in range(num_operations):
            timestamp = base_time + timedelta(minutes=i*15)
            operation = random.choice(operations)
            file_type = random.choice(file_types)
            
            # Simulate realistic performance metrics
            if operation == 'faf_read':
                duration_ms = random.gauss(40, 10)  # Average 40ms
                size_bytes = random.randint(100, 50000)
            elif operation == 'faf_write':
                duration_ms = random.gauss(94, 20)  # Average 94ms
                size_bytes = random.randint(500, 100000)
            else:
                duration_ms = random.gauss(150, 50)
                size_bytes = random.randint(1000, 25000)
            
            data.append({
                'timestamp': timestamp,
                'operation': operation,
                'file_type': file_type,
                'duration_ms': max(1, duration_ms),  # Ensure positive
                'size_bytes': size_bytes,
                'success': random.random() > 0.02,  # 98% success rate
                'path': f'/test/path/file_{i}{file_type}'
            })
        
        return pd.DataFrame(data)
    
    def analyze_performance(self, df: pd.DataFrame) -> Dict:
        """Analyze performance metrics from operations data"""
        
        analysis = {
            'summary': {
                'total_operations': len(df),
                'unique_files': df['path'].nunique(),
                'time_range': {
                    'start': str(df['timestamp'].min()),
                    'end': str(df['timestamp'].max())
                },
                'success_rate': (df['success'].sum() / len(df) * 100)
            },
            'performance': {
                'avg_duration_ms': df['duration_ms'].mean(),
                'median_duration_ms': df['duration_ms'].median(),
                'p95_duration_ms': df['duration_ms'].quantile(0.95),
                'p99_duration_ms': df['duration_ms'].quantile(0.99),
                'total_bytes_processed': df['size_bytes'].sum(),
                'avg_file_size_bytes': df['size_bytes'].mean()
            },
            'by_operation': {},
            'by_file_type': {}
        }
        
        # Analysis by operation type
        for op in df['operation'].unique():
            op_data = df[df['operation'] == op]
            analysis['by_operation'][op] = {
                'count': len(op_data),
                'avg_duration_ms': op_data['duration_ms'].mean(),
                'avg_size_bytes': op_data['size_bytes'].mean(),
                'success_rate': (op_data['success'].sum() / len(op_data) * 100)
            }
        
        # Analysis by file type
        for ft in df['file_type'].unique():
            ft_data = df[df['file_type'] == ft]
            analysis['by_file_type'][ft] = {
                'count': len(ft_data),
                'avg_duration_ms': ft_data['duration_ms'].mean(),
                'avg_size_bytes': ft_data['size_bytes'].mean()
            }
        
        return analysis
    
    def generate_performance_report(self, analysis: Dict) -> str:
        """Generate a formatted performance report"""
        
        report = []
        report.append("=" * 60)
        report.append("FAF FILE TOOLS - PERFORMANCE ANALYSIS REPORT")
        report.append("=" * 60)
        report.append("")
        
        # Summary section
        report.append("📊 SUMMARY")
        report.append("-" * 40)
        summary = analysis['summary']
        report.append(f"Total Operations: {summary['total_operations']:,}")
        report.append(f"Unique Files: {summary['unique_files']:,}")
        report.append(f"Success Rate: {summary['success_rate']:.2f}%")
        report.append(f"Time Range: {summary['time_range']['start'][:19]} to")
        report.append(f"           {summary['time_range']['end'][:19]}")
        report.append("")
        
        # Performance metrics
        report.append("⚡ PERFORMANCE METRICS")
        report.append("-" * 40)
        perf = analysis['performance']
        report.append(f"Average Duration: {perf['avg_duration_ms']:.2f}ms")
        report.append(f"Median Duration: {perf['median_duration_ms']:.2f}ms")
        report.append(f"95th Percentile: {perf['p95_duration_ms']:.2f}ms")
        report.append(f"99th Percentile: {perf['p99_duration_ms']:.2f}ms")
        report.append(f"Total Bytes: {perf['total_bytes_processed']:,}")
        report.append(f"Avg File Size: {perf['avg_file_size_bytes']:.0f} bytes")
        report.append("")
        
        # By operation type
        report.append("🔧 PERFORMANCE BY OPERATION")
        report.append("-" * 40)
        for op, metrics in analysis['by_operation'].items():
            report.append(f"\n{op}:")
            report.append(f"  Count: {metrics['count']}")
            report.append(f"  Avg Duration: {metrics['avg_duration_ms']:.2f}ms")
            report.append(f"  Avg Size: {metrics['avg_size_bytes']:.0f} bytes")
            report.append(f"  Success Rate: {metrics['success_rate']:.2f}%")
        report.append("")
        
        # By file type
        report.append("📁 PERFORMANCE BY FILE TYPE")
        report.append("-" * 40)
        for ft, metrics in analysis['by_file_type'].items():
            report.append(f"{ft}: {metrics['count']} ops, "
                         f"{metrics['avg_duration_ms']:.1f}ms avg, "
                         f"{metrics['avg_size_bytes']:.0f} bytes avg")
        
        report.append("")
        report.append("=" * 60)
        report.append("Report generated by FAF Data Analyzer v2.0.0")
        report.append("🏎️ Built for speed. Designed for excellence.")
        
        return "\n".join(report)
    
    def export_metrics_csv(self, df: pd.DataFrame, filepath: str):
        """Export metrics to CSV for further analysis"""
        df.to_csv(filepath, index=False)
        return f"Exported {len(df)} records to {filepath}"
    
    def create_benchmark_suite(self) -> str:
        """Create a Python benchmark suite for FAF tools"""
        
        benchmark_code = '''#!/usr/bin/env python3
"""
FAF File Tools - Benchmark Suite
Measures performance of file operations
"""

import time
import os
import json
import random
import string
from pathlib import Path
from typing import List, Dict, Callable
import statistics


class FAFBenchmark:
    """Benchmark FAF file operations"""
    
    def __init__(self, iterations: int = 100):
        self.iterations = iterations
        self.results = {}
        self.test_dir = Path("benchmark_tests")
        self.test_dir.mkdir(exist_ok=True)
    
    def benchmark_operation(self, name: str, operation: Callable, *args, **kwargs) -> Dict:
        """Benchmark a single operation"""
        timings = []
        errors = 0
        
        for i in range(self.iterations):
            try:
                start = time.perf_counter()
                operation(*args, **kwargs)
                duration = (time.perf_counter() - start) * 1000  # Convert to ms
                timings.append(duration)
            except Exception as e:
                errors += 1
                print(f"Error in {name}: {e}")
        
        if timings:
            return {
                'name': name,
                'iterations': self.iterations,
                'errors': errors,
                'min_ms': min(timings),
                'max_ms': max(timings),
                'mean_ms': statistics.mean(timings),
                'median_ms': statistics.median(timings),
                'stdev_ms': statistics.stdev(timings) if len(timings) > 1 else 0,
                'success_rate': ((self.iterations - errors) / self.iterations * 100)
            }
        else:
            return {'name': name, 'errors': errors, 'success_rate': 0}
    
    def generate_test_file(self, size_kb: int) -> str:
        """Generate a test file of specified size"""
        content = ''.join(random.choices(string.ascii_letters + string.digits, 
                                        k=size_kb * 1024))
        filepath = self.test_dir / f"test_{size_kb}kb.txt"
        filepath.write_text(content)
        return str(filepath)
    
    def benchmark_read_operations(self):
        """Benchmark file read operations"""
        # Create test files of different sizes
        test_files = {
            '1KB': self.generate_test_file(1),
            '10KB': self.generate_test_file(10),
            '100KB': self.generate_test_file(100),
            '1MB': self.generate_test_file(1024)
        }
        
        results = {}
        for size, filepath in test_files.items():
            def read_op():
                with open(filepath, 'r') as f:
                    _ = f.read()
            
            results[f'read_{size}'] = self.benchmark_operation(f'Read {size}', read_op)
        
        return results
    
    def benchmark_write_operations(self):
        """Benchmark file write operations"""
        sizes = {'1KB': 1, '10KB': 10, '100KB': 100, '1MB': 1024}
        results = {}
        
        for size_name, size_kb in sizes.items():
            content = ''.join(random.choices(string.ascii_letters, k=size_kb * 1024))
            
            def write_op():
                filepath = self.test_dir / f"write_test_{random.randint(1, 10000)}.txt"
                filepath.write_text(content)
                filepath.unlink()  # Clean up immediately
            
            results[f'write_{size_name}'] = self.benchmark_operation(
                f'Write {size_name}', write_op
            )
        
        return results
    
    def benchmark_json_operations(self):
        """Benchmark JSON read/write operations"""
        # Create test JSON data
        test_data = {
            'small': {'key': 'value'} * 10,
            'medium': {'key': 'value'} * 100,
            'large': {'key': 'value'} * 1000
        }
        
        results = {}
        
        for size, data in test_data.items():
            # Write benchmark
            def json_write():
                filepath = self.test_dir / f"json_test_{random.randint(1, 10000)}.json"
                with open(filepath, 'w') as f:
                    json.dump(data, f)
                filepath.unlink()
            
            results[f'json_write_{size}'] = self.benchmark_operation(
                f'JSON Write {size}', json_write
            )
            
            # Prepare file for read benchmark
            test_file = self.test_dir / f"json_read_{size}.json"
            with open(test_file, 'w') as f:
                json.dump(data, f)
            
            # Read benchmark
            def json_read():
                with open(test_file, 'r') as f:
                    _ = json.load(f)
            
            results[f'json_read_{size}'] = self.benchmark_operation(
                f'JSON Read {size}', json_read
            )
        
        return results
    
    def run_full_benchmark(self) -> Dict:
        """Run complete benchmark suite"""
        print("🏎️ Starting FAF Benchmark Suite...")
        print("-" * 50)
        
        all_results = {}
        
        print("📖 Benchmarking read operations...")
        all_results.update(self.benchmark_read_operations())
        
        print("✍️ Benchmarking write operations...")
        all_results.update(self.benchmark_write_operations())
        
        print("🔧 Benchmarking JSON operations...")
        all_results.update(self.benchmark_json_operations())
        
        return all_results
    
    def generate_report(self, results: Dict) -> str:
        """Generate benchmark report"""
        report = []
        report.append("=" * 60)
        report.append("FAF FILE TOOLS - BENCHMARK RESULTS")
        report.append("=" * 60)
        report.append("")
        
        # Group results by operation type
        read_ops = {k: v for k, v in results.items() if 'read' in k}
        write_ops = {k: v for k, v in results.items() if 'write' in k}
        
        # Read operations
        report.append("📖 READ OPERATIONS")
        report.append("-" * 40)
        for name, metrics in read_ops.items():
            report.append(f"{name}:")
            report.append(f"  Mean: {metrics['mean_ms']:.2f}ms")
            report.append(f"  Median: {metrics['median_ms']:.2f}ms")
            report.append(f"  Min/Max: {metrics['min_ms']:.2f}ms / {metrics['max_ms']:.2f}ms")
            report.append(f"  Success: {metrics['success_rate']:.1f}%")
            report.append("")
        
        # Write operations
        report.append("✍️ WRITE OPERATIONS")
        report.append("-" * 40)
        for name, metrics in write_ops.items():
            report.append(f"{name}:")
            report.append(f"  Mean: {metrics['mean_ms']:.2f}ms")
            report.append(f"  Median: {metrics['median_ms']:.2f}ms")
            report.append(f"  Min/Max: {metrics['min_ms']:.2f}ms / {metrics['max_ms']:.2f}ms")
            report.append(f"  Success: {metrics['success_rate']:.1f}%")
            report.append("")
        
        # Overall statistics
        all_means = [v['mean_ms'] for v in results.values() if 'mean_ms' in v]
        report.append("📊 OVERALL STATISTICS")
        report.append("-" * 40)
        report.append(f"Total Operations: {sum(v.get('iterations', 0) for v in results.values())}")
        report.append(f"Average Duration: {statistics.mean(all_means):.2f}ms")
        report.append(f"Operations Tested: {len(results)}")
        
        report.append("")
        report.append("=" * 60)
        report.append("🏁 Benchmark Complete!")
        
        return "\\n".join(report)


if __name__ == "__main__":
    # Run benchmark
    benchmark = FAFBenchmark(iterations=50)
    results = benchmark.run_full_benchmark()
    
    # Generate and print report
    report = benchmark.generate_report(results)
    print(report)
    
    # Save results to JSON
    with open('benchmark_results.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print("\\n✅ Results saved to benchmark_results.json")
'''
        
        return benchmark_code


def main():
    """Run data analysis demonstration"""
    print("🐍 FAF File Tools - Python Data Analysis")
    print("=" * 50)
    
    analyzer = FAFDataAnalyzer()
    
    # Generate sample data
    print("\n📊 Generating sample performance data...")
    df = analyzer.generate_sample_data(100)
    print(f"✅ Generated {len(df)} operation records")
    
    # Analyze performance
    print("\n🔍 Analyzing performance metrics...")
    analysis = analyzer.analyze_performance(df)
    
    # Generate report
    report = analyzer.generate_performance_report(analysis)
    print("\n" + report)
    
    # Export to CSV
    csv_path = "faf_metrics.csv"
    result = analyzer.export_metrics_csv(df, csv_path)
    print(f"\n✅ {result}")
    
    # Save benchmark suite
    print("\n🏎️ Generating benchmark suite...")
    benchmark_code = analyzer.create_benchmark_suite()
    with open("faf_benchmark.py", "w") as f:
        f.write(benchmark_code)
    print("✅ Created faf_benchmark.py")
    
    # Save analysis results
    with open("faf_analysis_results.json", "w") as f:
        json.dump(analysis, f, indent=2, default=str)
    print("✅ Saved analysis results to faf_analysis_results.json")


if __name__ == "__main__":
    main()
