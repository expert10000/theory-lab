"""Independent hydrogenic limiting cases, harmonic conventions and grid diagnostics."""
import hashlib
import math
import tempfile
import threading
import unittest
from pathlib import Path
import numpy as np
from jsonschema.exceptions import ValidationError
from scipy.integrate import quad
from quantum_worker.contracts import validate
from quantum_worker.engines.orbital import radial, wavefunction, orbital, radial_nodes


def job(n=1,l=0,m=0,basis="complex",Z=1,radius=8,grid=31):
    return {"schema":"quantum-job/v1","jobId":"orbital-test","operation":"orbital","engine":"native",
            "model":{"type":"hydrogenic","parameters":dict(n=n,l=l,m=m,basis=basis,Z=Z,radius=radius,grid=grid)}}


class OrbitalTests(unittest.TestCase):
    def test_radial_nodes_and_spherical_cube_bounds(self):
        for n in (1,2,3):
            for l in range(n):
                for Z in (1,3,6):
                    nodes=radial_nodes(n,l,Z)
                    self.assertEqual(len(nodes),n-l-1)
                    self.assertTrue(all(r>0 for r in nodes))
                    self.assertTrue(all(abs(float(radial(n,l,Z,r)))<1e-12 for r in nodes))
        self.assertAlmostEqual(radial_nodes(2,0,1)[0],2)
        np.testing.assert_allclose(radial_nodes(3,0,1),[1.5*(3-math.sqrt(3)),1.5*(3+math.sqrt(3))],atol=1e-12)
        self.assertAlmostEqual(radial_nodes(3,1,1)[0],6)
        with tempfile.TemporaryDirectory() as root:
            for radius,Z in ((.5,1),(2,3),(120,6)):
                result=orbital(job(radius=radius,Z=Z),root,threading.Event(),lambda *_:None)
                bounds=result["analysis"]["cubeProbabilityBounds"]
                for q,value in zip((radius,math.sqrt(3)*radius),bounds):
                    u=Z*q
                    expected=1-math.exp(-2*u)*(1+2*u+2*u*u)
                    self.assertAlmostEqual(value,expected,places=10)
                self.assertLessEqual(bounds[0],bounds[1]+1e-12)

    def test_closed_forms_nodes_and_real_convention(self):
        for Z in (1,3,6):
            p=job(Z=Z)["model"]["parameters"]
            for x,y,z in [(0.,0.,0.),(1.,0.,0.),(1.,2.,3.)]:
                psi=wavefunction(p,np.array(x),np.array(y),np.array(z))
                self.assertAlmostEqual(psi.real,Z**1.5*math.exp(-Z*math.sqrt(x*x+y*y+z*z))/math.sqrt(math.pi),places=12)
                self.assertEqual(psi.imag,0)
            self.assertAlmostEqual(float(radial(2,0,Z,2/Z)),0,places=14)
        p=job(2,1,1,"real_cos")["model"]["parameters"]
        self.assertGreater(wavefunction(p,np.array(1.),np.array(0.),np.array(0.)),0)
        self.assertAlmostEqual(float(wavefunction(p,np.array(0.),np.array(1.),np.array(0.))),0,places=14)
        self.assertAlmostEqual(float(wavefunction(p,np.array(-1.),np.array(0.),np.array(0.))),-float(wavefunction(p,np.array(1.),np.array(0.),np.array(0.))),places=14)
        p["basis"]="real_sin"
        self.assertGreater(wavefunction(p,np.array(0.),np.array(1.),np.array(0.)),0)
        p["basis"]="complex"
        positive=wavefunction(p,np.array(1.),np.array(2.),np.array(3.))
        p["m"]=-1
        negative=wavefunction(p,np.array(1.),np.array(2.),np.array(3.))
        self.assertAlmostEqual(abs(negative+np.conj(positive)),0,places=14)

    def test_all_supported_radial_and_angular_norms(self):
        mu,weights=np.polynomial.legendre.leggauss(20)
        phi=np.arange(40)*2*np.pi/40
        x=np.sqrt(1-mu[:,None]**2)*np.cos(phi)
        y=np.sqrt(1-mu[:,None]**2)*np.sin(phi)
        z=np.broadcast_to(mu[:,None],x.shape)
        for n in (1,2,3):
            for l in range(n):
                norm=quad(lambda r:r*r*float(radial(n,l,1,r))**2,0,np.inf)[0]
                mean=quad(lambda r:r**3*float(radial(n,l,1,r))**2,0,np.inf)[0]
                self.assertAlmostEqual(norm,1,places=10)
                self.assertAlmostEqual(mean,(3*n*n-l*(l+1))/2,places=9)
                for m in range(-l,l+1):
                    for basis in ("complex","real_cos","real_sin"):
                        if basis!="complex" and (m<0 or (basis=="real_sin" and m==0)):continue
                        p=job(n,l,m,basis)["model"]["parameters"]
                        # r=1 has no radial node for these states; divide out R to test angular norm.
                        angular=wavefunction(p,x,y,z)/radial(n,l,1,1.)
                        self.assertAlmostEqual(float(np.sum(np.abs(angular)**2*weights[:,None])*2*np.pi/40),1,places=12)

    def test_artifact_grid_integral_and_resolution_without_renormalization(self):
        with tempfile.TemporaryDirectory() as root:
            errors=[]
            for grid in (21,31,49):
                progress=[]
                result=orbital(job(grid=grid),root,threading.Event(),lambda n,total:progress.append((n,total)))
                data=Path(root,result["data"]["path"]).read_bytes()
                self.assertEqual(hashlib.sha256(data).hexdigest(),result["data"]["sha256"])
                values=np.frombuffer(data,dtype="<f8").reshape((grid,grid,grid,2))
                self.assertAlmostEqual(values[grid//2,grid//2,grid//2,0],1/math.sqrt(math.pi),places=14)
                self.assertTrue(np.all(values[:,:,:,1]==0))
                w=np.ones(grid);w[[0,-1]]=.5
                measured=np.sum(values[:,:,:,0]**2*w[:,None,None]*w[None,:,None]*w[None,None,:])*(16/(grid-1))**3
                self.assertAlmostEqual(measured,result["analysis"]["gridProbability"],places=12)
                errors.append(abs(measured-1))
                self.assertEqual(progress[0],(0,grid));self.assertEqual(progress[-1],(grid,grid))
                self.assertEqual(result["analysis"]["energyHartree"],-.5)
            self.assertGreater(errors[0],errors[1]);self.assertGreater(errors[1],errors[2])
            self.assertLess(errors[2],.006)
            tail=orbital(job(radius=.5),root,threading.Event(),lambda *_:None)
            self.assertLess(tail["analysis"]["gridProbability"],.2)
            charge=orbital(job(n=3,l=2,Z=6,radius=12),root,threading.Event(),lambda *_:None)
            self.assertEqual(charge["analysis"]["energyHartree"],-2)

    def test_cancellation_and_invalid_quantum_numbers(self):
        with tempfile.TemporaryDirectory() as root:
            cancel=threading.Event()
            result=orbital(job(grid=49),root,cancel,lambda count,total:cancel.set() if count>=2 else None)
            self.assertIsNone(result);self.assertEqual(list(Path(root).iterdir()),[])
        for bad in (job(1,1),job(2,1,2),job(2,1,-1,"real_cos"),job(2,1,0,"real_sin"),job(grid=100),job(Z=0)):
            with self.assertRaises((ValueError,ValidationError)):validate("quantum-job",bad)


if __name__=="__main__":unittest.main()
